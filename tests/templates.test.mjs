import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";

const raiz = fileURLToPath(new URL("..", import.meta.url));

globalThis.fetch = async (url) => {
        const bytes = readFileSync(join(raiz, "public", url));
        return {
                ok: true,
                status: 200,
                arrayBuffer: async () =>
                        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        };
};

const { FORMAT_OPTIONS, formatFrom, isFormatAvailable, panelsPerFace } = await import(
        "../src/domain/index.ts"
);
const { TEMPLATES, templateFor, panelSize } = await import("../src/lib/pdf/templates.ts");
const { imposePoems } = await import("../src/lib/pdf/imposition.ts");
const { generateZinePdf } = await import("../src/lib/pdf/zine.ts");
const { A4_PORTRAIT, A4_LANDSCAPE, PAGE_MARGIN, PANEL_GUTTER } = await import(
        "../src/lib/pdf/layout.ts"
);

const pdfDoc = await PDFDocument.create();
const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);
const fonts = { title: fonte, subtitle: fonte, date: fonte, body: fonte };

const poemas = [
        { title: "Um", subtitle: "", date: "", body: "primeiro" },
        { title: "Dois", subtitle: "", date: "", body: "segundo" },
        { title: "Tres", subtitle: "", date: "", body: "terceiro" },
];

function capa(extra = {}) {
        return {
                coverTitle: "Zine",
                authorName: "Steve",
                titleFont: "geistSans",
                authorFont: "geistSans",
                date: "19/11/2026",
                ...extra,
        };
}

test("os quatro templates declaram folha, grade e ordem de leitura", () => {
        const esperado = {
                "banner-a4": { orientation: "portrait", columns: 1, rows: 1, sheet: A4_PORTRAIT },
                "duas-colunas-vertical": {
                        orientation: "portrait",
                        columns: 2,
                        rows: 1,
                        sheet: A4_PORTRAIT,
                },
                "duas-colunas-horizontal": {
                        orientation: "landscape",
                        columns: 1,
                        rows: 2,
                        sheet: A4_LANDSCAPE,
                },
                "quatro-retangulos": {
                        orientation: "portrait",
                        columns: 2,
                        rows: 2,
                        sheet: A4_PORTRAIT,
                },
        };

        for (const [id, medidas] of Object.entries(esperado)) {
                const template = TEMPLATES[id];

                assert.ok(template, `falta o template ${id}`);
                assert.equal(template.orientation, medidas.orientation);
                assert.equal(template.columns, medidas.columns);
                assert.equal(template.rows, medidas.rows);
                assert.equal(template.sheet.width, medidas.sheet.width);
                assert.equal(template.sheet.height, medidas.sheet.height);
                assert.equal(template.slots.length, medidas.columns * medidas.rows);
        }
});

test("T2 le da esquerda para a direita", () => {
        const [primeiro, segundo] = TEMPLATES["duas-colunas-vertical"].slots;

        assert.ok(primeiro.x < segundo.x, "o painel 2 precisa estar a direita do 1");
        assert.equal(primeiro.y, segundo.y);
        assert.equal(primeiro.width, segundo.width);
        assert.equal(segundo.x - (primeiro.x + primeiro.width), PANEL_GUTTER);
});

test("T3 le de cima para baixo", () => {
        const [primeiro, segundo] = TEMPLATES["duas-colunas-horizontal"].slots;

        assert.ok(primeiro.y > segundo.y, "o painel 2 precisa estar abaixo do 1");
        assert.equal(primeiro.x, segundo.x);
        assert.equal(primeiro.height, segundo.height);
        assert.equal(primeiro.y - (segundo.y + segundo.height), PANEL_GUTTER);
});

test("T4 le em Z: esquerda para a direita, cima para baixo", () => {
        const [a, b, c, d] = TEMPLATES["quatro-retangulos"].slots;

        assert.ok(a.x < b.x && a.y === b.y, "1 e 2 dividem a linha de cima");
        assert.ok(a.y > c.y && a.x === c.x, "3 fica abaixo de 1");
        assert.ok(c.x < d.x && c.y === d.y, "4 fecha a linha de baixo");
});

test("nenhum painel escapa da margem nem se sobrepoe", () => {
        for (const template of Object.values(TEMPLATES)) {
                const { width, height } = template.sheet;

                for (const slot of template.slots) {
                        assert.ok(slot.x >= PAGE_MARGIN - 0.001, `${template.id}: x na margem`);
                        assert.ok(slot.y >= PAGE_MARGIN - 0.001, `${template.id}: y na margem`);
                        assert.ok(
                                slot.x + slot.width <= width - PAGE_MARGIN + 0.001,
                                `${template.id}: painel passa da margem direita`
                        );
                        assert.ok(
                                slot.y + slot.height <= height - PAGE_MARGIN + 0.001,
                                `${template.id}: painel passa da margem superior`
                        );
                }

                for (let i = 0; i < template.slots.length; i += 1) {
                        for (let j = i + 1; j < template.slots.length; j += 1) {
                                const a = template.slots[i];
                                const b = template.slots[j];
                                const separados =
                                        a.x + a.width <= b.x + 0.001 ||
                                        b.x + b.width <= a.x + 0.001 ||
                                        a.y + a.height <= b.y + 0.001 ||
                                        b.y + b.height <= a.y + 0.001;

                                assert.ok(separados, `${template.id}: paineis ${i} e ${j} se sobrepoem`);
                        }
                }
        }
});

test("o banner A4 mantem o painel da leitura simples", () => {
        const template = TEMPLATES["banner-a4"];
        const painel = panelSize(template);

        assert.equal(painel.width, A4_PORTRAIT.width - PAGE_MARGIN * 2);
        assert.equal(painel.height, A4_PORTRAIT.height - PAGE_MARGIN * 2);
});

test("a imposicao enche uma face antes de abrir a seguinte", () => {
        const faces = imposePoems(TEMPLATES["duas-colunas-vertical"], poemas, fonts);

        assert.equal(faces.length, 2);
        assert.equal(faces[0].panels.length, 2);
        assert.equal(faces[0].panels[0].runs[0].text, "Um");
        assert.equal(faces[0].panels[1].runs[0].text, "Dois");
        assert.equal(faces[1].panels[0].runs[0].text, "Tres");
        assert.equal(faces[1].panels[1], null, "a sobra da face fica vazia");
});

test("as poesias curtas ocupam a primeira folha do T4", () => {
        const faces = imposePoems(TEMPLATES["quatro-retangulos"], poemas, fonts);

        assert.equal(faces.length, 1);
        assert.deepEqual(
                faces[0].panels.map((painel) => painel?.runs[0].text ?? null),
                ["Um", "Dois", "Tres", null]
        );
});

test("poema longo atravessa faces sem perder verso", () => {
        const verso = Array.from({ length: 120 }, (_, i) => `verso ${i + 1}`).join("\n");
        const faces = imposePoems(
                TEMPLATES["quatro-retangulos"],
                [{ title: "Longo", subtitle: "", date: "", body: verso }],
                fonts
        );

        assert.ok(faces.length > 1, "esperava mais de uma face");

        const linhas = faces.flatMap((face) =>
                face.panels.flatMap((painel) =>
                        painel
                                ? painel.runs.filter((run) => run.role === "body").map((run) => run.text)
                                : []
                )
        );

        assert.equal(linhas.length, 120, "nenhum verso pode ficar de fora");
        assert.equal(linhas[0], "verso 1");
        assert.equal(linhas[linhas.length - 1], "verso 120");
});

test("cada dobra gera o PDF na orientacao e no numero de folhas certos", async () => {
        const esperado = {
                "banner-a4": { paginas: 4, orientacao: "portrait" },
                "duas-colunas-vertical": { paginas: 3, orientacao: "portrait" },
                "duas-colunas-horizontal": { paginas: 3, orientacao: "landscape" },
                "quatro-retangulos": { paginas: 2, orientacao: "portrait" },
        };

        for (const [format, medidas] of Object.entries(esperado)) {
                const bytes = await generateZinePdf(capa({ format, poems: poemas }));
                const doc = await PDFDocument.load(bytes);

                assert.equal(doc.getPageCount(), medidas.paginas, `${format}: paginas`);

                for (let index = 0; index < doc.getPageCount(); index += 1) {
                        const { width, height } = doc.getPage(index).getSize();
                        const retrato = width < height;

                        assert.equal(
                                retrato,
                                medidas.orientacao === "portrait",
                                `${format}: pagina ${index} fora da orientacao`
                        );
                }
        }
});

test("formato sem imposicao implementada e recusado", async () => {
        await assert.rejects(
                () => generateZinePdf(capa({ format: "mini-zine", poems: poemas })),
                /sem imposicao/
        );
});

test("o seletor mostra as quatro dobras com a ordem de leitura", () => {
        const fonte = readFileSync(
                join(raiz, "src/components/FormatSelector/index.tsx"),
                "utf8"
        );

        for (const id of [
                "banner-a4",
                "duas-colunas-vertical",
                "duas-colunas-horizontal",
                "quatro-retangulos",
        ]) {
                assert.ok(fonte.includes(`"${id}"`), `o diagrama de ${id} deveria existir`);
        }

        assert.ok(/>1</.test(fonte) && />4</.test(fonte), "a ordem de leitura precisa ser numerada");
});

test("formatFrom traduz o formato antigo e cai no padrao", () => {
        assert.equal(formatFrom("reading"), "banner-a4");
        assert.equal(formatFrom("quatro-retangulos"), "quatro-retangulos");
        assert.equal(formatFrom("inexistente"), "banner-a4");
        assert.equal(formatFrom(undefined), "banner-a4");
});

test("as quatro dobras estao habilitadas com a contagem de paineis certa", () => {
        const disponiveis = FORMAT_OPTIONS.filter((option) => option.available);

        assert.deepEqual(
                disponiveis.map((option) => [option.id, option.panelsPerFace]),
                [
                        ["banner-a4", 1],
                        ["duas-colunas-vertical", 2],
                        ["duas-colunas-horizontal", 2],
                        ["quatro-retangulos", 4],
                ]
        );

        assert.equal(isFormatAvailable("mini-zine"), false);
        assert.equal(panelsPerFace("banner-a4"), 1);
        assert.equal(panelsPerFace("quatro-retangulos"), 4);
});

test("templateFor devolve null para as dobras ainda nao implementadas", () => {
        assert.equal(templateFor("mini-zine"), null);
        assert.equal(templateFor("saddle-stitch"), null);
        assert.ok(templateFor("banner-a4"));
});
