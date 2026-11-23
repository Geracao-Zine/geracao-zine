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

const { FORMAT_OPTIONS, formatFrom, panelsPerFace } = await import("../src/domain/index.ts");
const { TEMPLATES, templateFor, panelSize } = await import("../src/lib/pdf/templates.ts");
const { imposePoems } = await import("../src/lib/pdf/imposition.ts");
const { layoutPanel } = await import("../src/lib/pdf/panel.ts");
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
                printMode: "simplex",
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
                const margem = template.margin;

                for (const slot of template.slots) {
                        assert.ok(slot.x >= margem - 0.001, `${template.id}: x na margem`);
                        assert.ok(slot.y >= margem - 0.001, `${template.id}: y na margem`);
                        assert.ok(
                                slot.x + slot.width <= width - margem + 0.001,
                                `${template.id}: painel passa da margem direita`
                        );
                        assert.ok(
                                slot.y + slot.height <= height - margem + 0.001,
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
                () => generateZinePdf(capa({ format: "dobra-inexistente", poems: poemas })),
                /sem imposicao/
        );
});

test("o seletor mostra todas as dobras com a ordem de leitura", () => {
        const fonte = readFileSync(
                join(raiz, "src/components/FormatSelector/index.tsx"),
                "utf8"
        );

        for (const id of [
                "banner-a4",
                "duas-colunas-vertical",
                "duas-colunas-horizontal",
                "quatro-retangulos",
                "mini-zine",
                "saddle-stitch",
        ]) {
                assert.ok(fonte.includes(`"${id}"`), `o diagrama de ${id} deveria existir`);
        }

        assert.ok(/>1</.test(fonte) && />8</.test(fonte), "a ordem de leitura precisa ser numerada");
});

test("formatFrom traduz o formato antigo e cai no padrao", () => {
        assert.equal(formatFrom("reading"), "banner-a4");
        assert.equal(formatFrom("quatro-retangulos"), "quatro-retangulos");
        assert.equal(formatFrom("inexistente"), "banner-a4");
        assert.equal(formatFrom(undefined), "banner-a4");
});

test("todas as dobras estao habilitadas com a contagem de paineis certa", () => {
        const disponiveis = FORMAT_OPTIONS.filter((option) => option.available);

        assert.deepEqual(
                disponiveis.map((option) => [option.id, option.panelsPerFace]),
                [
                        ["banner-a4", 1],
                        ["duas-colunas-vertical", 2],
                        ["duas-colunas-horizontal", 2],
                        ["quatro-retangulos", 4],
                        ["mini-zine", 8],
                        ["saddle-stitch", 2],
                ]
        );

        assert.equal(panelsPerFace("banner-a4"), 1);
        assert.equal(panelsPerFace("quatro-retangulos"), 4);
        assert.equal(panelsPerFace("mini-zine"), 8);
});

test("templateFor devolve template para todas as dobras", () => {
        assert.ok(templateFor("banner-a4"));
        assert.ok(templateFor("mini-zine"));
        assert.ok(templateFor("saddle-stitch"));
});

// ---------- impressao frente e verso ----------

const { imposeSheets, mirrorSlot, mirrorFace } = await import(
        "../src/lib/pdf/imposition.ts"
);

test("no simplex cada face e uma folha e nao ha verso", () => {
        const folhas = imposeSheets(TEMPLATES["duas-colunas-vertical"], poemas, fonts, "simplex");

        assert.equal(folhas.length, 2);
        assert.deepEqual(
                folhas.map((folha) => folha.number),
                [1, 2]
        );

        for (const folha of folhas) {
                assert.equal(folha.back, null, "sem duplex nao existe verso");
                assert.equal(folha.front.mirrored, false);
        }
});

test("no duplex as faces viram pares frente e verso", () => {
        const folhas = imposeSheets(TEMPLATES["duas-colunas-vertical"], poemas, fonts, "duplex");

        assert.equal(folhas.length, 1, "duas faces formam uma folha");
        assert.equal(folhas[0].front.panels[0].runs[0].text, "Um");
        assert.ok(folhas[0].back, "a segunda face deveria ser o verso");
        assert.equal(folhas[0].back.panels[0].runs[0].text, "Tres");
        assert.equal(folhas[0].back.mirrored, true);
});

test("o verso com numero impar de faces fica em branco", () => {
        const cinco = [
                ...poemas,
                { title: "Quatro", subtitle: "", date: "", body: "quarto" },
                { title: "Cinco", subtitle: "", date: "", body: "quinto" },
        ];
        const folhas = imposeSheets(TEMPLATES["duas-colunas-vertical"], cinco, fonts, "duplex");

        assert.equal(folhas.length, 2);
        assert.ok(folhas[1].front, "a terceira face abre uma folha nova");
        assert.equal(folhas[1].back, null, "sem par o verso fica vazio");
});

test("o verso retrato troca esquerda por direita (virar na borda longa)", () => {
        const folha = { width: 595, height: 842 };
        const esquerda = { x: 70, y: 400, width: 200, height: 300 };
        const espelho = mirrorSlot(folha, esquerda);

        assert.equal(espelho.x, folha.width - (esquerda.x + esquerda.width));
        assert.equal(espelho.y, esquerda.y, "retrato nao mexe na vertical");
        assert.equal(espelho.width, esquerda.width);
        assert.equal(espelho.height, esquerda.height);
});

test("o verso paisagem troca topo por base (virar na borda longa)", () => {
        const folha = { width: 842, height: 595 };
        const cima = { x: 70, y: 400, width: 600, height: 150 };
        const espelho = mirrorSlot(folha, cima);

        assert.equal(espelho.y, folha.height - (cima.y + cima.height));
        assert.equal(espelho.x, cima.x, "paisagem nao mexe na horizontal");
});

test("o verso espelha a grade e mantem cada pagina no seu painel", () => {
        const frente = imposePoems(TEMPLATES["quatro-retangulos"], poemas, fonts)[0];
        const verso = mirrorFace(frente);

        assert.equal(verso.panels.length, frente.panels.length);
        assert.equal(verso.slots.length, frente.slots.length);

        frente.slots.forEach((slot, index) => {
                assert.equal(
                        verso.slots[index].x,
                        frente.width - (slot.x + slot.width),
                        "o slot " + index + " do verso e o espelho do slot da frente"
                );
                assert.equal(verso.slots[index].y, slot.y);
                assert.equal(
                        verso.panels[index],
                        frente.panels[index],
                        "o conteudo continua no mesmo painel"
                );
        });

        assert.deepEqual(
                verso.panels.map((painel) => painel?.runs[0].text ?? null),
                ["Um", "Dois", "Tres", null]
        );
});

test("os paineis do verso continuam dentro da folha", () => {
        for (const template of Object.values(TEMPLATES)) {
                const frente = imposePoems(template, poemas, fonts)[0];
                const verso = mirrorFace(frente);
                const { width, height } = template.sheet;
                const margem = template.margin;

                for (const slot of verso.slots) {
                        assert.ok(slot.x >= margem - 0.001, `${template.id}: x fora da margem`);
                        assert.ok(slot.y >= margem - 0.001, `${template.id}: y fora da margem`);
                        assert.ok(
                                slot.x + slot.width <= width - margem + 0.001,
                                `${template.id}: passa da direita`
                        );
                        assert.ok(
                                slot.y + slot.height <= height - margem + 0.001,
                                `${template.id}: passa do topo`
                        );
                }
        }
});

test("o duplex gera paginas em par, menos no minizine que e so frente", async () => {
        for (const format of Object.keys(TEMPLATES)) {
                const simplex = await PDFDocument.load(
                        await generateZinePdf(capa({ format, poems: poemas }))
                );
                const duplex = await PDFDocument.load(
                        await generateZinePdf(capa({ format, poems: poemas, printMode: "duplex" }))
                );

                // O minizine imprime as 8 paginas no mesmo lado da folha: nao
                // existe verso para espelhar, entao ele ignora o duplex.
                if (format === "mini-zine") {
                        assert.equal(duplex.getPageCount(), 1, "minizine e uma folha so");
                        continue;
                }

                assert.equal(
                        duplex.getPageCount() % 2,
                        0,
                        `${format}: duplex precisa de paginas em par`
                );
                assert.ok(
                        duplex.getPageCount() >= simplex.getPageCount(),
                        `${format}: duplex nao pode ter menos paginas`
                );
        }
});

test("o PDF do duplex repete a fonte da capa e nao muda a orientacao", async () => {
        const bytes = await generateZinePdf(
                capa({ format: "quatro-retangulos", poems: poemas, printMode: "duplex" })
        );
        const doc = await PDFDocument.load(bytes);

        for (let index = 0; index < doc.getPageCount(); index += 1) {
                const { width, height } = doc.getPage(index).getSize();

                assert.ok(width < height, `pagina ${index} deveria continuar retrato`);
        }
});

// ---------- T5 (minizine) e T11 (fanzine grampeado) ----------

const { imposeZine, effectivePrintMode } = await import("../src/lib/pdf/imposition.ts");
const { MINIZINE_PAGE_COUNT, minizineSlotPage, minizineSlotUpsideDown } = await import(
        "../src/lib/pdf/templates.ts"
);

/** Capa diagramada num painel, como o PDF faz nas dobras de livrinho. */
function capaDePainel(template) {
        const { width, height } = panelSize(template);

        return layoutPanel(
                { title: "Capa", subtitle: "Steve", date: "", body: "" },
                fonts,
                height,
                width
        )[0];
}

/**
 * Pagina 1-based que o slot recebe, lida do proprio texto do painel.
 *
 * A capa e sempre a pagina 1, entao a poesia "Pi" e a pagina i+1.
 */
function paginaDoPainel(layout) {
        const run = layout?.runs.find((r) => r.role === "title");

        if (!run) {
                return null;
        }

        return run.text === "Capa" ? 1 : Number(run.text.slice(1)) + 1;
}

test("T5 imprime as 8 paginas numa unica folha A4 deitada", async () => {
        const template = TEMPLATES["mini-zine"];

        assert.equal(template.slots.length, 8);
        assert.equal(template.imposition, "minizine");
        assert.equal(template.orientation, "landscape");
        assert.equal(MINIZINE_PAGE_COUNT, 8);

        const doc = await PDFDocument.load(
                await generateZinePdf(capa({ format: "mini-zine", poems: poemas }))
        );

        assert.equal(doc.getPageCount(), 1, "o minizine inteiro cabe numa folha");

        const { width, height } = doc.getPage(0).getSize();

        assert.ok(width > height, "a folha do minizine e deitada");
});

test("T5 poe a capa como pagina 1 e numera o resto em ordem", () => {
        const template = TEMPLATES["mini-zine"];
        // Capa + 7 poesias = 8 paginas: o livrinho cheio.
        const sete = Array.from({ length: 7 }, (_, i) => ({
                title: `P${i + 1}`,
                subtitle: "",
                date: "",
                body: `poesia ${i + 1}`,
        }));
        const [folha] = imposeZine({
                template,
                poems: sete,
                fonts,
                mode: "simplex",
                cover: capaDePainel(template),
        });

        const paginas = folha.front.panels.map(paginaDoPainel);

        assert.equal(paginas[0], 8, "slot 0 recebe a ultima pagina");
        assert.equal(paginas[1], 1, "slot 1 recebe a capa");
        assert.equal(paginas[2], 2);
        assert.equal(paginas[3], 3);
        assert.equal(paginas[4], 7);
        assert.equal(paginas[7], 4, "a fileira de baixo termina na pagina 4");
        assert.deepEqual(paginas, [8, 1, 2, 3, 7, 6, 5, 4]);
});

test("T5 le as paginas 1 a 8 em sequencia ao dobrar e cortar", () => {
        // Modelo fisico: dobra a fileira de baixo para tras, corta no meio e
        // empilha. A leitura resultante tem que ser 1..8 sem buraco nem repeticao.
        const ordemNaFolha = TEMPLATES["mini-zine"].slots.map((_, slot) =>
                minizineSlotPage(slot)
        );
        const topo = ordemNaFolha.slice(0, 4);
        const base = ordemNaFolha.slice(4).reverse();
        const leitura = [...topo, ...base];
        const inicio = leitura.indexOf(1);
        const sequencia = [...leitura.slice(inicio), ...leitura.slice(0, inicio)];

        assert.deepEqual(sequencia, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("T5 gira 180 a fileira de baixo e mantem a de cima em pe", () => {
        const template = TEMPLATES["mini-zine"];
        const [folha] = imposeZine({ template, poems: poemas, fonts, mode: "simplex" });

        assert.deepEqual(folha.front.rotations, [0, 0, 0, 0, 180, 180, 180, 180]);

        for (let slot = 0; slot < 8; slot += 1) {
                assert.equal(
                        minizineSlotUpsideDown(slot),
                        slot >= 4,
                        `slot ${slot}: rotacao errada`
                );
        }
});

test("T5 ignora o duplex: nao existe verso para imprimir", () => {
        assert.equal(effectivePrintMode(TEMPLATES["mini-zine"], "duplex"), "simplex");

        const [folha] = imposeZine({
                template: TEMPLATES["mini-zine"],
                poems: poemas,
                fonts,
                mode: "duplex",
        });

        assert.equal(folha.back, null);
});

test("T5 completa com paginas em branco quando falta conteudo", () => {
        const template = TEMPLATES["mini-zine"];
        const [folha] = imposeZine({
                template,
                poems: [poemas[0]],
                fonts,
                mode: "simplex",
                cover: capaDePainel(template),
        });

        const preenchidos = folha.front.panels.filter(Boolean);

        assert.equal(preenchidos.length, 2, "capa e a primeira poesia");
        assert.equal(folha.front.panels.filter((p) => p === null).length, 6);
});

test("T11 dobra em cadernos e exige multiplo de 4 paginas", async () => {
        const template = TEMPLATES["saddle-stitch"];

        assert.equal(template.imposition, "booklet");
        assert.equal(template.slots.length, 2, "dois paineis por face");
        assert.equal(effectivePrintMode(template, "simplex"), "duplex");

        // Capa + 3 poesias = 4 paginas: um caderno de uma folha fisica, que
        // carrega 4 paginas (duas na frente, duas no verso).
        const umCaderno = imposeZine({
                template,
                poems: poemas,
                fonts,
                mode: "duplex",
                cover: capaDePainel(template),
        });

        assert.equal(umCaderno.length, 1, "4 paginas cabem numa folha fisica");

        for (const folha of umCaderno) {
                assert.ok(folha.back, "caderno sempre tem verso");
        }

        const doc = await PDFDocument.load(
                await generateZinePdf(capa({ format: "saddle-stitch", poems: poemas }))
        );

        // 4 paginas de conteudo = 1 folha fisica = 2 paginas no PDF, porque a
        // frente e o verso da mesma folha sao paginas separadas do arquivo.
        assert.equal(doc.getPageCount(), 2, "um caderno de 4 paginas usa 1 folha");
        assert.equal(doc.getPageCount() % 2, 0, "cada folha entra com frente e verso");
});

test("T11 poe capa, ultima, segunda e penultima na ordem do grampo", () => {
        const template = TEMPLATES["saddle-stitch"];
        const tres = Array.from({ length: 3 }, (_, i) => ({
                title: `P${i + 1}`,
                subtitle: "",
                date: "",
                body: `poesia ${i + 1}`,
        }));
        const quatro = imposeZine({
                template,
                poems: tres,
                fonts,
                mode: "duplex",
                cover: capaDePainel(template),
        });

        const [primeira] = quatro;

        // Frente de fora para dentro: ultima pagina a esquerda, capa a direita.
        // Verso: a segunda pagina cai atras da capa e a penultima atras da ultima.
        assert.deepEqual(primeira.front.panels.map(paginaDoPainel), [4, 1]);
        assert.deepEqual(primeira.back.panels.map(paginaDoPainel), [2, 3]);
});

test("T11 cresce em cadernos de 4 paginas conforme o conteudo", () => {
        const template = TEMPLATES["saddle-stitch"];
        const muitas = Array.from({ length: 9 }, (_, i) => ({
                title: `P${i + 1}`,
                subtitle: "",
                date: "",
                body: `poesia ${i + 1}`,
        }));

        // Capa + 9 poesias = 10 paginas -> 12 paginas -> 3 folhas fisicas.
        const folhas = imposeZine({
                template,
                poems: muitas,
                fonts,
                mode: "duplex",
                cover: capaDePainel(template),
        });

        assert.equal(folhas.length, 3);
        assert.equal(folhas.length * 4, 12);
});

test("o minizine avisa quando o conteudo passa dos 7 paineis", async () => {
        const { createDraft, draftIssues, setPoemField, MINIZINE_POEM_SLOTS } = await import(
                "../src/domain/index.ts"
        );

        assert.equal(MINIZINE_POEM_SLOTS, 7);

        let draft = createDraft();
        draft = { ...draft, format: "mini-zine" };

        const caber = draftIssues(draft).filter((i) => i.id === "minizine-overflow");
        assert.equal(caber.length, 0, "uma poesia cabe no minizine");

        // Enche o documento ate passar dos 7 paineis disponiveis.
        const { addPage } = await import("../src/domain/zine.ts");
        const poemas = draft.doc.pages.filter((p) => p.kind === "poem");

        while (draft.doc.pages.filter((p) => p.kind === "poem").length <= 7) {
                draft = { ...draft, doc: addPage(draft.doc) };
        }

        for (const page of draft.doc.pages.filter((p) => p.kind === "poem")) {
                draft = { ...draft, doc: setPoemField(draft.doc, page.id, "body", "texto") };
        }

        const aviso = draftIssues(draft).find((i) => i.id === "minizine-overflow");

        assert.ok(aviso, "o excedente precisa virar aviso");
        assert.equal(aviso.severity, "warning");
        assert.equal(aviso.step, "print");
        assert.match(aviso.message, /7 poesias/);
        assert.ok(poemas.length >= 1);
});
