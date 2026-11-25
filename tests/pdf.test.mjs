import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const moduloPdf = join(raiz, "src/lib/pdf");

// O modulo de PDF roda no servidor e no navegador, mas nunca dentro do React:
// ele recebe um modelo pronto. Estas duas funcoes de disco alimentam o fetch
// com os TTFs de public/, que e o que o navegador faria.
globalThis.fetch = async (url) => {
	const bytes = readFileSync(join(raiz, "public", url));
	return {
		ok: true,
		arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
	};
};

const { generateZinePdf } = await import("../src/lib/pdf/zine.ts");

const cenario = {
	coverTitle: "Meu Zine Teste",
	authorName: "Steve",
	titleFont: "geistMono",
	authorFont: "geistSans",
	date: "19/11/2026",
	format: "banner-a4",
	poems: [
		{
			title: "Primeiro poema",
			subtitle: "um subtítulo",
			date: "19/11/2026",
			body: "coração ação linguiça avó São Paulo\n\nsegunda estrofe",
		},
		{ title: "", subtitle: "", date: "", body: "poema sem titulo" },
	],
};

function comRelogioFixo(fn) {
	const RealDate = Date;
	globalThis.Date = class extends RealDate {
		constructor(...args) {
			super(...(args.length ? args : [1770000000000]));
		}
		static now() {
			return 1770000000000;
		}
	};

	return fn().finally(() => {
		globalThis.Date = RealDate;
	});
}

test("o modulo de PDF nao importa React", () => {
	const arquivos = readdirSync(moduloPdf).filter((nome) => nome.endsWith(".ts"));

	assert.ok(arquivos.length > 0, "esperava arquivos em src/lib/pdf");

	for (const nome of arquivos) {
		const fonte = readFileSync(join(moduloPdf, nome), "utf8");
		assert.ok(
			!/from\s+["']react["']|from\s+["']react\//.test(fonte),
			`${nome} importa React`
		);
	}
});

test("o modulo de PDF nao importa pdf-lib estaticamente", () => {
	const arquivos = readdirSync(moduloPdf).filter((nome) => nome.endsWith(".ts"));

	for (const nome of arquivos) {
		const fonte = readFileSync(join(moduloPdf, nome), "utf8");
		const estatico = /^\s*import\s+(?!type\b)[^;]*from\s+["']pdf-lib["']/m.test(fonte);
		assert.ok(!estatico, `${nome} importa pdf-lib estaticamente`);
	}
});

test("generateZinePdf gera um PDF valido", async () => {
	const bytes = await generateZinePdf(cenario);

	assert.ok(bytes instanceof Uint8Array);
	assert.ok(bytes.length > 1000);

	const assinatura = new TextDecoder().decode(bytes.slice(0, 5));
	assert.equal(assinatura, "%PDF-");

	const doc = await PDFDocument.load(bytes);
	// capa + um poema por pagina
	assert.equal(doc.getPageCount(), 3);
});

test("pagina em branco com blocos gera um PDF valido", async () => {
        const bytes = await generateZinePdf({
                ...cenario,
                poems: [
                        {
                                title: "",
                                subtitle: "",
                                date: "",
                                body: "",
                                blocks: [
                                        {
                                                id: "block-1",
                                                kind: "title",
                                                text: "Título do bloco",
                                                x: 24,
                                                y: 24,
                                                width: 200,
                                                height: 60,
                                                font: "geistMono",
                                                size: 18,
                                                color: 0,
                                                align: "left",
                                        },
                                ],
                        },
                ],
        });

        assert.ok(bytes instanceof Uint8Array);
        assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
        const doc = await PDFDocument.load(bytes);
        assert.ok(doc.getPageCount() >= 2);
});

test("generateZinePdf e deterministico com o relogio fixo", async () => {
	const primeiro = await comRelogioFixo(() => generateZinePdf(cenario));
	const segundo = await comRelogioFixo(() => generateZinePdf(cenario));

	assert.deepEqual(primeiro, segundo);
});

test("generateZinePdf quebra pagina quando o poema nao cabe", async () => {
	const verso = Array.from({ length: 80 }, (_, i) => `linha ${i + 1}`).join("\n");
	const bytes = await generateZinePdf({
		...cenario,
		poems: [{ title: "Longo", subtitle: "", date: "", body: verso }],
	});

	const doc = await PDFDocument.load(bytes);
	// capa + varias paginas do mesmo poema
	assert.ok(doc.getPageCount() > 2, `esperava mais de 2 paginas, veio ${doc.getPageCount()}`);
});

test("generateZinePdf aceita zine sem autor", async () => {
	const bytes = await generateZinePdf({ ...cenario, authorName: "" });

	const doc = await PDFDocument.load(bytes);
	assert.equal(doc.getPageCount(), 3);
});

test("generateZinePdf aceita zine sem poemas", async () => {
	const bytes = await generateZinePdf({ ...cenario, poems: [] });

	const doc = await PDFDocument.load(bytes);
	assert.equal(doc.getPageCount(), 1);
});

test("campo opcional vazio devolve altura e permite corpo maior no PDF", async () => {
        const { PANEL_HEIGHT, POEM_BODY_MIN_SIZE } = await import("../src/lib/pdf/layout.ts");
        const { layoutPanel } = await import("../src/lib/pdf/panel.ts");
        const { StandardFonts: Fontes, PDFDocument: Documento } = await import("pdf-lib");
        const doc = await Documento.create();
        const fonte = await doc.embedFont(Fontes.Helvetica);
        const fontes = { title: fonte, subtitle: fonte, date: fonte, body: fonte };

        // Texto que so cabe com o corpo reduzido quando o cabecalho ocupa o topo.
        const corpo = Array.from({ length: 50 }, (_, i) => `verso ${i + 1}`).join("\n");
        const semCampos = layoutPanel({ title: "", subtitle: "", date: "", body: corpo }, fontes);
        const comCampos = layoutPanel(
                { title: "Título", subtitle: "Subtítulo", date: "19/11/2026", body: corpo },
                fontes
        );

        assert.equal(semCampos.length, 1, "sem cabecalho o texto deve caber numa pagina");
        assert.equal(comCampos.length, 1, "o ajuste automatico deve evitar a continuacao");
        assert.ok(
                comCampos[0].bodySize < semCampos[0].bodySize,
                "o cabecalho reduz a caixa e o corpo escolhido precisa diminuir"
        );
        assert.ok(comCampos[0].bodySize >= POEM_BODY_MIN_SIZE);
        assert.ok(semCampos[0].box.height <= PANEL_HEIGHT);
});
