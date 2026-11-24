import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFArray, PDFDocument, PDFRawStream } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const raiz = fileURLToPath(new URL("..", import.meta.url));

// O preview pede as fontes por caminho absoluto ("/fonts/x.ttf"), como o
// navegador faria; aqui servimos os mesmos arquivos de public/.
globalThis.fetch = async (url) => {
	const bytes = readFileSync(join(raiz, "public", url));
	return {
		ok: true,
		status: 200,
		arrayBuffer: async () =>
			bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
	};
};

const { loadPanelFonts, layoutPreview, panelDrawables, orderedPanelElements } = await import(
	"../src/lib/preview/index.ts"
);
const { layoutPanel, layoutPanelElements, toPanelPageLayout } = await import(
	"../src/lib/pdf/panel.ts"
);
const { generateZinePdf } = await import("../src/lib/pdf/zine.ts");

function inflate(bytes) {
	try {
		return inflateSync(bytes).toString("latin1");
	} catch {
		return new TextDecoder().decode(bytes);
	}
}

const poemas = [
	{ title: "Curto", subtitle: "", date: "", body: "um verso so" },
	{
		title: "Médio",
		subtitle: "com subtítulo",
		date: "19/11/2026",
		body: Array.from({ length: 40 }, (_, i) => `verso ${i + 1}`).join("\n"),
	},
	{
		title: "Extremo",
		subtitle: "",
		date: "",
		body: Array.from({ length: 400 }, (_, i) => `verso ${i + 1}`).join("\n"),
	},
];

test("preview e PDF usam o mesmo motor e chegam ao mesmo layout", async () => {
	const fonts = await loadPanelFonts("geistSans");

	for (const poema of poemas) {
		const preview = layoutPreview(poema, fonts);
		const pdf = layoutPanelElements(poema, fonts);

		assert.deepEqual(preview, pdf, `layout divergente em "${poema.title}"`);
		}
});

test("elementos posicionados preservam posicao, tamanho e ordem nos dois renderizadores", async () => {
        const fonts = await loadPanelFonts("geistSans");

        for (const poema of poemas) {
                const preview = layoutPreview(poema, fonts);
                const pdf = layoutPanelElements(poema, fonts);

                assert.deepEqual(preview, pdf, `layout divergente em "${poema.title}"`);

                for (const page of preview) {
                        const ordered = orderedPanelElements(page);
                        const porZ = [...page.elements].sort((a, b) => a.z - b.z);

                        assert.deepEqual(ordered, porZ, "a ordem de empilhamento mudou");

                        for (const element of ordered) {
                                assert.ok(element.rect.width > 0, "elemento sem largura");
                                assert.ok(element.rect.height > 0, "elemento sem altura");

                                if (element.type !== "text") {
                                        continue;
                                }

                                for (const line of element.content.lines) {
                                        assert.ok(
                                                line.x >= element.rect.x - 1e-9,
                                                "linha antes da borda esquerda do elemento"
                                        );
                                        assert.ok(
                                                line.baseline >= element.rect.y - 1e-9,
                                                "linha antes do topo do elemento"
                                        );
                                }
                        }

                        const drawables = panelDrawables(page);
                        assert.deepEqual(
                                drawables.map((item) => item.z),
                                [...drawables.map((item) => item.z)].sort((a, b) => a - b),
                                "os comandos de desenho precisam sair na ordem de empilhamento"
                        );
                }
        }
});


test("preview e PDF escolhem o mesmo corpo de fonte", async () => {
	const fonts = await loadPanelFonts("geistSans");

	for (const poema of poemas) {
		const preview = layoutPreview(poema, fonts);
		const pdf = layoutPanelElements(poema, fonts);

		assert.equal(
			toPanelPageLayout(preview[0]).bodySize,
			toPanelPageLayout(pdf[0]).bodySize,
			`corpo divergente em "${poema.title}"`
		);
	}
});

test("a fonte carregada pelo preview e a mesma face que o PDF embute", async () => {
	// O preview mede com widthOfTextAtSize do pdf-lib sobre o TTF real. Se
	// o arquivo mudasse de um lado so, o preview deixaria de bater.
	const fonts = await loadPanelFonts("geistMono");
	const bytes = readFileSync(join(raiz, "public/fonts/geist-mono-regular.ttf"));

	const doc = await PDFDocument.create();
	doc.registerFontkit(fontkit);
	const esperada = await doc.embedFont(bytes, { subset: true });

	const amostra = "coração ação linguiça avó São Paulo";
	assert.equal(
		fonts.body.widthOfTextAtSize(amostra, 12),
		esperada.widthOfTextAtSize(amostra, 12)
	);
});

test("loadPanelFonts reaproveita a mesma instancia por fonte", async () => {
	const primeira = await loadPanelFonts("geistSans");
	const segunda = await loadPanelFonts("geistSans");

	assert.equal(primeira, segunda);
});

test("o PDF respeita o corpo escolhido pelo motor", async () => {
	const fonts = await loadPanelFonts("geistSans");
	const poema = poemas[1];
	const layout = layoutPanel(poema, fonts)[0];
	const esperados = [...new Set(layout.runs.map((run) => run.size))].sort();

	const bytes = await generateZinePdf({
		coverTitle: "Zine",
		authorName: "Steve",
		titleFont: "geistSans",
		authorFont: "geistSans",
		date: "19/11/2026",
		format: "banner-a4",
		poems: [poema],
	});

	const doc = await PDFDocument.load(bytes);
	assert.equal(doc.getPageCount(), 2, "capa + uma pagina do poema");

	// O tamanho do texto desenhado fica no fluxo de conteudo da pagina.
	const conteudoRef = doc.getPage(1).node.Contents();
	const refs = conteudoRef instanceof PDFArray ? conteudoRef.asArray() : [conteudoRef];
	// Os fluxos saem comprimidos (FlateDecode); descomprimir antes de ler.
	const conteudo = refs
		.map((item) => inflate(doc.context.lookup(item, PDFRawStream).contents))
		.join("\n");
	const tamanhos = [...conteudo.matchAll(/\s(\d+(?:\.\d+)?)\s+Tf/g)].map((m) => Number(m[1]));

	assert.ok(tamanhos.length > 0, "esperava operadores Tf no conteudo");
	assert.deepEqual(
		[...new Set(tamanhos)].sort(),
		esperados,
		"os corpos desenhados no PDF precisam ser os que o motor escolheu"
	);
});

test("o PDF desenha os comandos do preview na mesma posicao e tamanho", async () => {
        const fonts = await loadPanelFonts("geistSans");
        const poema = poemas[0];
        const { TEMPLATES, panelSize } = await import("../src/lib/pdf/templates.ts");
        const template = TEMPLATES["banner-a4"];
        const slot = template.slots[0];
        const layout = layoutPreview(poema, fonts, panelSize(template))[0];
        const esperados = panelDrawables(layout)
                .filter((item) => item.kind === "text")
                .map((item) => ({
                        x: slot.x + item.x,
                        y: slot.y + slot.height - item.y,
                        size: item.size,
                }));

        const bytes = await generateZinePdf({
                coverTitle: "Zine",
                authorName: "Steve",
                titleFont: "geistSans",
                authorFont: "geistSans",
                date: "19/11/2026",
                format: "banner-a4",
                poems: [poema],
        });
        const doc = await PDFDocument.load(bytes);
        const conteudoRef = doc.getPage(1).node.Contents();
        const refs = conteudoRef instanceof PDFArray ? conteudoRef.asArray() : [conteudoRef];
        const conteudo = refs
                .map((item) => inflate(doc.context.lookup(item, PDFRawStream).contents))
                .join("\n");

        const desenhados = [...conteudo.matchAll(/BT([\s\S]*?)ET/g)].map((bloco) => {
                const matriz = bloco[1].match(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/);
                const tamanho = bloco[1].match(/([\d.]+) Tf/);

                return {
                        x: Number(matriz[1]),
                        y: Number(matriz[2]),
                        size: Number(tamanho[1]),
                };
        });

        assert.equal(desenhados.length, esperados.length);
        desenhados.forEach((item, index) => {
                assert.ok(Math.abs(item.x - esperados[index].x) < 1e-6, "x divergente");
                assert.ok(Math.abs(item.y - esperados[index].y) < 1e-6, "y divergente");
                assert.equal(item.size, esperados[index].size, "corpo divergente");
        });

        const regra = panelDrawables(layout).find((item) => item.kind === "rule");
        if (regra) {
                const traco = conteudo.match(
                        /([\d.]+) ([\d.]+) m\s+[\d.]+ [\d.]+ m\s+([\d.]+) ([\d.]+) l\s+S/
                );

                assert.ok(traco, "esperava a regra no fluxo de conteudo");
                assert.ok(Math.abs(Number(traco[1]) - (slot.x + regra.x1)) < 1e-6);
                assert.ok(Math.abs(Number(traco[2]) - (slot.y + slot.height - regra.y1)) < 1e-6);
                assert.ok(Math.abs(Number(traco[3]) - (slot.x + regra.x2)) < 1e-6);
                assert.ok(Math.abs(Number(traco[4]) - (slot.y + slot.height - regra.y1)) < 1e-6);
        }
});


test("PDF e preview desenham pelos mesmos comandos de elemento", () => {
        const pdf = readFileSync(join(raiz, "src/lib/pdf/zine.ts"), "utf8");
        const preview = readFileSync(
                join(raiz, "src/components/PoemPreview/index.tsx"),
                "utf8"
        );

        assert.match(pdf, /panelDrawables\(layout\)/);
        assert.match(preview, /panelDrawables\(page\)/);
        assert.ok(
                !/layout\.runs|layout\.divider|page\.runs|page\.divider/.test(pdf + preview),
                "os renderizadores precisam consumir PanelLayout, nao o contrato antigo"
        );
});


test("o componente de preview nao duplica a regra de diagramacao", () => {
	const fonte = readFileSync(
		join(raiz, "src/components/PoemPreview/index.tsx"),
		"utf8"
	);

	assert.match(fonte, /from "@\/lib\/preview"/);
	assert.ok(
		!/layoutPanel|fitBody|widthOfTextAtSize/.test(fonte),
		"o preview precisa delegar a medicao ao motor, nao reimplementar"
	);
});

test("o modulo de preview nao importa React", () => {
	const arquivos = readdirSync(join(raiz, "src/lib/preview")).filter((nome) =>
		nome.endsWith(".ts")
	);

	assert.ok(arquivos.length > 0, "esperava arquivos em src/lib/preview");

	for (const nome of arquivos) {
		const fonte = readFileSync(join(raiz, "src/lib/preview", nome), "utf8");
		assert.ok(
			!/from\s+["']react["']|from\s+["']react\//.test(fonte),
			`${nome} importa React`
		);
	}
});

test("preview e PDF medem no mesmo tamanho de painel em toda dobra", async () => {
        const { loadPanelFonts, layoutPreview, previewPanelFor } = await import(
                "../src/lib/preview/index.ts"
        );
        const { TEMPLATES, panelSize } = await import("../src/lib/pdf/templates.ts");

        const fonts = await loadPanelFonts("geistSans");
        const corpos = [3, 40, 120];

        for (const id of Object.keys(TEMPLATES)) {
                const { width, height } = panelSize(TEMPLATES[id]);

                for (const total of corpos) {
                        const poema = {
                                title: "T",
                                subtitle: "s",
                                date: "19/11/2026",
                                body: Array.from({ length: total }, (_, i) => `verso ${i + 1}`).join("\n"),
                        };

                        const preview = layoutPreview(poema, fonts, previewPanelFor(id));
                        const pdf = layoutPanelElements(poema, fonts, height, width);

                        assert.equal(
                                preview.length,
                                pdf.length,
                                `${id} com ${total} versos: numero de paginas divergente`
                        );
                        assert.equal(
                                toPanelPageLayout(preview[0]).bodySize,
                                toPanelPageLayout(pdf[0]).bodySize,
                                `${id} com ${total} versos: corpo de fonte divergente`
                        );
                }
        }
});

test("o painel do preview vem do template da dobra", async () => {
        const { previewPanelFor } = await import("../src/lib/preview/index.ts");
        const { TEMPLATES, panelSize } = await import("../src/lib/pdf/templates.ts");

        for (const id of Object.keys(TEMPLATES)) {
                assert.deepEqual(
                        previewPanelFor(id),
                        panelSize(TEMPLATES[id]),
                        `a dobra ${id} precisa usar o painel do seu template`
                );
        }
});
