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

const { TEMPLATES, panelSize, sheetPlanPage, sheetPlanUpsideDown } = await import(
        "../src/lib/pdf/templates.ts"
);
const { imposeZine, effectivePrintMode } = await import("../src/lib/pdf/imposition.ts");
const { layoutPanel } = await import("../src/lib/pdf/panel.ts");
const { generateZinePdf } = await import("../src/lib/pdf/zine.ts");
const { poemCapacity } = await import("../src/domain/index.ts");
const { A4_LANDSCAPE, A4_PORTRAIT } = await import("../src/lib/pdf/layout.ts");

const pdfDoc = await PDFDocument.create();
const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);
const fonts = { title: fonte, subtitle: fonte, date: fonte, body: fonte };

/** Poesias curtas numeradas: o titulo "P3" e a pagina 4 do zine. */
function poemasDe(quantidade) {
        return Array.from({ length: quantidade }, (_, i) => ({
                title: `P${i + 1}`,
                subtitle: "",
                date: "",
                body: `poesia ${i + 1}`,
        }));
}

function capa(extra = {}) {
        return {
                coverTitle: "Zine",
                authorName: "Steve",
                titleFont: "geistSans",
                authorFont: "geistSans",
                date: "19/11/2026",
                printMode: "simplex",
                ...extra,
        };
}

function capaDePainel(template) {
        const { width, height } = panelSize(template);

        return layoutPanel(
                { title: "Capa", subtitle: "Steve", date: "", body: "" },
                fonts,
                height,
                width
        )[0];
}

/** Pagina 1-based do slot, lida do texto do painel (a capa e a pagina 1). */
function paginaDoPainel(layout) {
        const run = layout?.runs.find((r) => r.role === "title");

        if (!run) {
                return null;
        }

        return run.text === "Capa" ? 1 : Number(run.text.slice(1)) + 1;
}

const NOVAS = ["trifold", "z-fold", "accordion", "gatefold", "folio-unico", "mini-zine-16"];

test("T6, T7, T8, T9, T10 e T12 estao no catalogo com grade e imposicao", () => {
        const esperado = {
                trifold: { columns: 3, rows: 1, sheet: A4_LANDSCAPE, imposition: "spread" },
                "z-fold": { columns: 3, rows: 1, sheet: A4_LANDSCAPE, imposition: "spread" },
                accordion: { columns: 4, rows: 1, sheet: A4_LANDSCAPE, imposition: "spread" },
                gatefold: { columns: 4, rows: 1, sheet: A4_LANDSCAPE, imposition: "spread" },
                "folio-unico": { columns: 1, rows: 1, sheet: A4_PORTRAIT, imposition: "spread" },
                "mini-zine-16": { columns: 4, rows: 4, sheet: A4_PORTRAIT, imposition: "minizine" },
        };

        for (const [id, props] of Object.entries(esperado)) {
                const template = TEMPLATES[id];

                assert.ok(template, `${id} precisa existir`);
                assert.equal(template.columns, props.columns, `${id}: colunas`);
                assert.equal(template.rows, props.rows, `${id}: fileiras`);
                assert.deepEqual(template.sheet, props.sheet, `${id}: folha`);
                assert.equal(template.imposition, props.imposition, `${id}: imposicao`);
                assert.equal(template.slots.length, props.columns * props.rows, `${id}: slots`);
        }
});

test("cada dobra nova cabe na folha e nao sobrepoe paineis", () => {
        for (const id of NOVAS) {
                const template = TEMPLATES[id];
                const { width, height } = template.sheet;

                for (const slot of template.slots) {
                        assert.ok(slot.x >= 0, `${id}: painel fora a esquerda`);
                        assert.ok(slot.y >= 0, `${id}: painel abaixo da folha`);
                        assert.ok(slot.x + slot.width <= width, `${id}: painel passa a direita`);
                        assert.ok(slot.y + slot.height <= height, `${id}: painel passa do topo`);
                        assert.ok(slot.width > 0 && slot.height > 0, `${id}: painel vazio`);
                }

                for (let a = 0; a < template.slots.length; a += 1) {
                        for (let b = a + 1; b < template.slots.length; b += 1) {
                                const um = template.slots[a];
                                const outro = template.slots[b];
                                const separados =
                                        um.x + um.width <= outro.x ||
                                        outro.x + outro.width <= um.x ||
                                        um.y + um.height <= outro.y ||
                                        outro.y + outro.height <= um.y;

                                assert.ok(separados, `${id}: paineis ${a} e ${b} se sobrepoem`);
                        }
                }
        }
});

test("as dobras de frente e verso exigem duplex; o livrinho de 16 nao tem verso", () => {
        for (const id of ["trifold", "z-fold", "accordion", "gatefold", "folio-unico"]) {
                assert.equal(
                        effectivePrintMode(TEMPLATES[id], "simplex"),
                        "duplex",
                        `${id}: precisa dos dois lados`
                );
        }

        assert.equal(effectivePrintMode(TEMPLATES["mini-zine-16"], "duplex"), "simplex");
});

test("T6 trifold: a capa fica na porta esquerda e o miolo desce em ordem", () => {
        const template = TEMPLATES.trifold;
        const [folha] = imposeZine({
                template,
                poems: poemasDe(5),
                fonts,
                mode: "duplex",
                cover: capaDePainel(template),
        });

        const frente = folha.front.panels.map(paginaDoPainel);
        const verso = folha.back.panels.map(paginaDoPainel);

        assert.deepEqual(frente, [1, 6, 3]);
        assert.deepEqual(verso, [2, 4, 5]);

        // Fechado, o leitor ve a capa na coluna da esquerda.
        assert.equal(frente[0], 1);
        // Abrindo, encontra 2 e 3; desdobrando, 4 e 5; o verso fecha em 6.
        assert.deepEqual([verso[0], frente[2]], [2, 3]);
        assert.deepEqual([verso[1], verso[2]], [4, 5]);
        assert.equal(frente[1], 6);
});

test("T7 dobra em Z: as faces alternam de lado na sanfona", () => {
        const template = TEMPLATES["z-fold"];
        const [folha] = imposeZine({
                template,
                poems: poemasDe(5),
                fonts,
                mode: "duplex",
                cover: capaDePainel(template),
        });

        assert.deepEqual(folha.front.panels.map(paginaDoPainel), [1, 3, 5]);
        assert.deepEqual(folha.back.panels.map(paginaDoPainel), [2, 4, 6]);
});

test("T8 acordeao: quatro tiras continuas, sem corte", () => {
        const template = TEMPLATES.accordion;
        const [folha] = imposeZine({
                template,
                poems: poemasDe(7),
                fonts,
                mode: "duplex",
                cover: capaDePainel(template),
        });

        assert.equal(template.slots.length, 4);
        assert.deepEqual(folha.front.panels.map(paginaDoPainel), [1, 3, 5, 7]);
        assert.deepEqual(folha.back.panels.map(paginaDoPainel), [2, 4, 6, 8]);
});

test("T9 gatefold: a capa fica na porta direita e as portas abrem o miolo", () => {
        const template = TEMPLATES.gatefold;
        const [folha] = imposeZine({
                template,
                poems: poemasDe(7),
                fonts,
                mode: "duplex",
                cover: capaDePainel(template),
        });

        const frente = folha.front.panels.map(paginaDoPainel);
        const verso = folha.back.panels.map(paginaDoPainel);

        assert.deepEqual(frente, [8, 7, 6, 1]);
        assert.deepEqual(verso, [5, 4, 3, 2]);

        assert.equal(frente[3], 1, "fechado, a capa fica na porta da direita");
        assert.equal(frente[0], 8, "e a ultima pagina, na porta da esquerda");
});

test("T10 folha unica: uma poesia por face, so a frente quando nao ha verso", () => {
        const template = TEMPLATES["folio-unico"];
        const [folha] = imposeZine({
                template,
                poems: poemasDe(1),
                fonts,
                mode: "duplex",
                cover: capaDePainel(template),
        });

        assert.equal(template.slots.length, 1);
        assert.equal(folha.front.panels.length, 1);
        assert.equal(folha.back.panels.length, 1);
        assert.deepEqual(folha.front.panels.map(paginaDoPainel), [1]);
        assert.deepEqual(folha.back.panels.map(paginaDoPainel), [2]);
});

test("T12 livrinho de 16: 16 paginas numa folha retrato, com dois cortes", () => {
        const template = TEMPLATES["mini-zine-16"];

        assert.equal(template.slots.length, 16);
        assert.equal(template.sheetPlan.pageCount, 16);

        const [folha] = imposeZine({
                template,
                poems: poemasDe(15),
                fonts,
                mode: "simplex",
                cover: capaDePainel(template),
        });

        assert.equal(folha.back, null, "o livrinho de 16 imprime so um lado");

        const paginas = folha.front.panels.map(paginaDoPainel);
        assert.equal(paginas.length, 16);
        assert.equal(paginas[1], 1, "slot 1 recebe a capa");
        assert.equal(paginas[8], 16, "a metade de baixo comeca pela ultima pagina");
});

test("T12 livrinho de 16: cada metade le 1..8 e 9..16 ao cortar e dobrar", () => {
        const template = TEMPLATES["mini-zine-16"];
        const ordem = template.slots.map((_, slot) => sheetPlanPage(template, slot));

        // Corte horizontal no meio: dois minizines de 8 paginas empilhados.
        const metades = [ordem.slice(0, 8), ordem.slice(8)];

        for (const [indice, metade] of metades.entries()) {
                const topo = metade.slice(0, 4);
                const base = metade.slice(4).reverse();
                const leitura = [...topo, ...base];
                const inicio = leitura.indexOf(1 + indice * 8);
                const sequencia = [...leitura.slice(inicio), ...leitura.slice(0, inicio)];

                assert.deepEqual(
                        sequencia,
                        Array.from({ length: 8 }, (_, i) => i + 1 + indice * 8),
                        `metade ${indice + 1}: leitura fora de ordem`
                );
        }
});

test("T12 livrinho de 16: a fileira de baixo de cada metade sai girada", () => {
        const template = TEMPLATES["mini-zine-16"];

        for (let slot = 0; slot < 16; slot += 1) {
                const fileira = Math.floor(slot / 4);
                const girado = fileira % 2 === 1;

                assert.equal(
                        sheetPlanUpsideDown(template, slot),
                        girado,
                        `slot ${slot}: rotacao errada`
                );
        }
});

test("a capacidade de poesias acompanha os paineis de cada dobra", () => {
        assert.equal(poemCapacity("trifold"), 5, "6 paineis menos a capa");
        assert.equal(poemCapacity("z-fold"), 5);
        assert.equal(poemCapacity("accordion"), 7, "8 paineis menos a capa");
        assert.equal(poemCapacity("gatefold"), 7);
        assert.equal(poemCapacity("folio-unico"), 1, "2 paineis menos a capa");
        assert.equal(poemCapacity("mini-zine-16"), 15, "16 paineis menos a capa");
        assert.equal(poemCapacity("banner-a4"), null, "cresce com o conteudo");
        assert.equal(poemCapacity("saddle-stitch"), null);
});

test("a capa e a pagina 1 tambem nas dobras de leitura simples", () => {
        for (const id of [
                "banner-a4",
                "duas-colunas-vertical",
                "duas-colunas-horizontal",
                "quatro-retangulos",
        ]) {
                const template = TEMPLATES[id];
                const sheets = imposeZine({
                        template,
                        poems: poemasDe(3),
                        fonts,
                        mode: "simplex",
                        cover: capaDePainel(template),
                });

                const paginas = sheets
                        .flatMap((folha) => folha.front.panels)
                        .map(paginaDoPainel)
                        .filter((pagina) => pagina !== null);

                assert.deepEqual(paginas, [1, 2, 3, 4], `${id}: a capa precisa abrir a leitura`);
        }
});

test("cada dobra nova gera PDF na orientacao e no numero de paginas certos", async () => {
        const esperado = {
                trifold: { pages: 2, paisagem: true },
                "z-fold": { pages: 2, paisagem: true },
                accordion: { pages: 2, paisagem: true },
                gatefold: { pages: 2, paisagem: true },
                "folio-unico": { pages: 2, paisagem: false },
                "mini-zine-16": { pages: 1, paisagem: false },
        };

        for (const [format, props] of Object.entries(esperado)) {
                const doc = await PDFDocument.load(
                        await generateZinePdf(capa({ format, poems: poemasDe(3), printMode: "duplex" }))
                );

                assert.equal(doc.getPageCount(), props.pages, `${format}: numero de paginas`);

                for (let index = 0; index < doc.getPageCount(); index += 1) {
                        const { width, height } = doc.getPage(index).getSize();
                        const paisagem = width > height;

                        assert.equal(paisagem, props.paisagem, `${format}: orientacao da pagina ${index}`);
                        assert.deepEqual(
                                [width, height],
                                props.paisagem
                                        ? [A4_LANDSCAPE.width, A4_LANDSCAPE.height]
                                        : [A4_PORTRAIT.width, A4_PORTRAIT.height],
                                `${format}: tamanho real A4 na pagina ${index}`
                        );
                }
        }
});

test("o excedente de uma dobra fixa vira aviso com a capacidade certa", async () => {
        const { createDraft, draftIssues, setPoemField } = await import("../src/domain/index.ts");
        const { addPage } = await import("../src/domain/zine.ts");

        let draft = { ...createDraft(), format: "trifold" };
        draft = {
                ...draft,
                cover: { ...draft.cover, title: "Zine", author: "Steve" },
        };

        // 6 poesias nao cabem em 5 paineis depois da capa.
        while (draft.doc.pages.filter((p) => p.kind === "poem").length < 6) {
                draft = { ...draft, doc: addPage(draft.doc) };
        }

        for (const page of draft.doc.pages.filter((p) => p.kind === "poem")) {
                draft = { ...draft, doc: setPoemField(draft.doc, page.id, "body", "texto") };
        }

        const aviso = draftIssues(draft).find((i) => i.id === "format-overflow");

        assert.ok(aviso, "o excedente precisa virar aviso");
        assert.match(aviso.message, /comporta 5 poesias/);
        assert.match(aviso.message, /1 ficara de fora/);
        assert.equal(aviso.severity, "warning");
});

test("as dobras que crescem com o conteudo nao avisam excedente", async () => {
        const { createDraft, draftIssues } = await import("../src/domain/index.ts");

        for (const format of ["banner-a4", "saddle-stitch"]) {
                const draft = { ...createDraft(), format };
                const aviso = draftIssues(draft).find((i) => i.id === "format-overflow");

                assert.equal(aviso, undefined, `${format} nao tem limite fixo`);
        }
});

test("o PDF do livrinho de 16 gira as fileiras certas e cabe numa folha", async () => {
        const { inflateSync } = await import("node:zlib");

        const bytes = await generateZinePdf(capa({ format: "mini-zine-16", poems: poemasDe(15) }));
        const doc = await PDFDocument.load(bytes);

        assert.equal(doc.getPageCount(), 1, "o livrinho inteiro cabe numa folha");
        assert.equal(doc.getPage(0).getRotation().angle, 0, "a folha em si nao gira");

        // A rotacao dos paineis vai na matriz de texto (Tm), nao na pagina.
        const raw = Buffer.from(bytes);
        let idx = 0;
        let corpo = "";

        while ((idx = raw.indexOf("stream", idx)) !== -1) {
                let inicio = idx + 6;
                if (raw[inicio] === 0x0d) inicio += 1;
                if (raw[inicio] === 0x0a) inicio += 1;
                const fim = raw.indexOf("endstream", inicio);
                if (fim === -1) break;
                try {
                        const texto = inflateSync(raw.subarray(inicio, fim)).toString("latin1");
                        if (texto.includes("Tm")) corpo += texto;
                } catch {}
                idx = fim + 9;
        }

        const girados = corpo.match(/-1\s+-?[\d.e-]+\s+-?[\d.e-]+\s+-1\s+[\d.]+\s+[\d.]+\s+Tm/g) ?? [];
        const emPe = corpo.match(/1\s+0\s+0\s+1\s+[\d.]+\s+[\d.]+\s+Tm/g) ?? [];

        assert.ok(girados.length > 0, "as fileiras de baixo precisam sair giradas");
        assert.ok(emPe.length > 0, "as fileiras de cima precisam sair em pe");
});
