import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";

const {
        DEFAULT_TEXT_BLOCK_GAP,
        DEFAULT_TEXT_BLOCK_HEIGHT,
        DEFAULT_TEXT_BLOCK_OFFSET,
        DEFAULT_TEXT_BLOCK_WIDTH,
        MAX_TEXT_BLOCK_SIZE,
        addTextBlock,
        createDraft,
        createTextBlock,
        draftIssues,
        hasPoemContent,
        moveTextBlockLayer,
        nextTextBlockId,
        nextTextBlockZ,
        parseDraft,
        poemPages,
        serializeDraft,
        setPoemBlocks,
        textBlockFrom,
        textBlocksFrom,
        toggleTextBlockLock,
} = await import("../src/domain/index.ts");
const { layoutTextBlock, textBlockRect } = await import("../src/lib/pdf/text-block.ts");
const { layoutPanelElements, toPanelPageLayout } = await import("../src/lib/pdf/panel.ts");
const { panelDrawables } = await import("../src/lib/pdf/panel-render.ts");
const { wrapText } = await import("../src/lib/wrap-text.ts");

const pdfDoc = await PDFDocument.create();
const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
const fonts = { title: bold, subtitle: regular, date: regular, body: regular };

const bloco = {
        id: "bloco-1",
        kind: "title",
        text: "Um título posicionado",
        x: 123.5,
        y: 42.25,
        width: 180,
        height: 60,
        font: "geistMono",
        size: 18,
        color: 0.2,
        align: "center",
        z: 0,
        locked: false,
};

test("o bloco preserva posicao e tipografia ao ser lido", () => {
        assert.deepEqual(textBlockFrom(bloco, "fallback"), bloco);
});

test("campos invalidos caem no padrao sem descartar o bloco", () => {
        const lido = textBlockFrom(
                {
                        id: "",
                        kind: "invalido",
                        text: 42,
                        x: "x",
                        y: null,
                        width: -5,
                        height: 0,
                        font: "desconhecida",
                        size: 999,
                        color: -1,
                        align: "justify",
                },
                "fallback"
        );

        assert.equal(lido.id, "fallback");
        assert.equal(lido.kind, "text");
        assert.equal(lido.text, "");
        assert.equal(lido.x, 0);
        assert.equal(lido.y, 0);
        assert.equal(lido.width, DEFAULT_TEXT_BLOCK_WIDTH);
        assert.equal(lido.height, DEFAULT_TEXT_BLOCK_HEIGHT);
        assert.equal(lido.font, "geistSans");
        assert.equal(lido.size, MAX_TEXT_BLOCK_SIZE);
        assert.equal(lido.color, 0);
        assert.equal(lido.align, "left");
});

test("a lista de blocos mantem a ordem e ignora entradas invalidas", () => {
        const blocos = textBlocksFrom([
                bloco,
                null,
                { ...bloco, id: "bloco-2" },
                { ...bloco, id: "bloco-1" },
        ]);

        assert.deepEqual(
                blocos.map((item) => item.id),
                ["bloco-1", "bloco-2"]
        );
});

test("a tipografia por bloco sobrevive a salvar e recarregar", () => {
        const draft = createDraft();
        const poema = poemPages(draft.doc)[0];
        poema.blocks = [bloco];

        const recarregado = parseDraft(serializeDraft(draft));
        assert.deepEqual(poemPages(recarregado.doc)[0].blocks, [bloco]);
});

test("rascunho antigo sem blocos continua valido", () => {
        const recarregado = parseDraft(serializeDraft(createDraft()));

        assert.equal(poemPages(recarregado.doc)[0].blocks, undefined);
});

test("o retangulo do bloco e recortado para dentro do painel", () => {
        assert.deepEqual(
                textBlockRect({ ...bloco, x: 500, y: -20, width: 400, height: 30 }, 200, 100),
                { x: 0, y: 0, width: 200, height: 30 }
        );

        assert.deepEqual(
                textBlockRect({ ...bloco, x: 20, y: 10, width: 100, height: 40 }, 300, 200),
                { x: 20, y: 10, width: 100, height: 40 }
        );
});

test("o layout do bloco reaproveita wrapText e mantem o estilo", () => {
        const texto =
                "uma frase longa o bastante para quebrar em mais de uma linha dentro do bloco";
        const elemento = layoutTextBlock(
                { ...bloco, kind: "text", text: texto, x: 40, y: 30, width: 100, height: 50 },
                regular,
                300,
                200,
                3
        );

        assert.equal(elemento.type, "text");
        assert.deepEqual(elemento.rect, { x: 40, y: 30, width: 100, height: 50 });
        assert.equal(elemento.z, 3);


        assert.equal(elemento.locked, false);
        assert.equal(elemento.content.role, "body");
        assert.equal(elemento.content.size, bloco.size);
        assert.equal(elemento.content.color, bloco.color);
        assert.equal(elemento.content.align, bloco.align);
        assert.equal(elemento.content.font, bloco.font);
        assert.deepEqual(
                elemento.content.lines.map((line) => line.text),
                wrapText(texto, regular, bloco.size, 100)
        );
        assert.ok(elemento.content.lines.every((line) => line.baseline >= 30));
});

test("o alinhamento do bloco posiciona cada linha", () => {
        const texto = "curto";
        const base = { ...bloco, text: texto, x: 40, y: 30, width: 100, height: 50 };
        const largura = regular.widthOfTextAtSize(texto, bloco.size);
        const left = layoutTextBlock({ ...base, align: "left" }, regular, 300, 200);
        const center = layoutTextBlock({ ...base, align: "center" }, regular, 300, 200);
        const right = layoutTextBlock({ ...base, align: "right" }, regular, 300, 200);

        assert.equal(left.content.lines[0].x, 40);
        assert.ok(
                Math.abs(center.content.lines[0].x - (40 + (100 - largura) / 2)) < 1e-9
        );
        assert.ok(
                Math.abs(right.content.lines[0].x - (40 + 100 - largura)) < 1e-9
        );
});

test("bloco de titulo usa o papel de titulo", () => {
        const elemento = layoutTextBlock(
                { ...bloco, kind: "title" },
                regular,
                300,
                200
        );

        assert.equal(elemento.content.role, "title");
});

test("o criador de bloco usa os padroes do modelo", () => {
        const criado = createTextBlock("text", "novo");

        assert.equal(criado.id, "novo");
        assert.equal(criado.kind, "text");
        assert.equal(criado.width, DEFAULT_TEXT_BLOCK_WIDTH);
        assert.equal(criado.height, DEFAULT_TEXT_BLOCK_HEIGHT);
        assert.equal(criado.align, "left");
        assert.equal(criado.locked, false);
});

test("blocos novos nascem na frente da pilha", () => {
        const area = { width: 300, height: 400 };
        const primeiro = addTextBlock([], "title", area);
        const segundo = addTextBlock(primeiro, "text", area);

        assert.equal(primeiro[0].z, 0);
        assert.equal(segundo[1].z, 1);
        assert.equal(nextTextBlockZ(segundo), 2);
});

test("trazer para frente e enviar para tras trocam as camadas", () => {
        const base = [
                { ...bloco, id: "a", z: 0 },
                { ...bloco, id: "b", z: 1 },
                { ...bloco, id: "c", z: 2 },
        ];
        const camadas = (blocks) => Object.fromEntries(blocks.map((item) => [item.id, item.z]));

        assert.deepEqual(camadas(moveTextBlockLayer(base, "b", "front")), { a: 0, b: 2, c: 1 });
        assert.deepEqual(camadas(moveTextBlockLayer(base, "b", "back")), { a: 1, b: 0, c: 2 });
        assert.deepEqual(camadas(moveTextBlockLayer(base, "c", "front")), { a: 0, b: 1, c: 2 });
});

test("blocos antigos ganham camadas pela ordem da lista", () => {
        const semCamada = textBlocksFrom([
                { ...bloco, id: "a", z: undefined },
                { ...bloco, id: "b", z: undefined },
        ]);

        assert.deepEqual(semCamada.map((item) => item.z), [0, 1]);
        assert.deepEqual(
                moveTextBlockLayer(semCamada, "a", "front").map((item) => item.z),
                [1, 0]
        );
});

test("travar alterna sem mexer na geometria", () => {
        const travado = toggleTextBlockLock([bloco], bloco.id);

        assert.equal(travado[0].locked, true);
        assert.equal(travado[0].x, bloco.x);
        assert.equal(toggleTextBlockLock(travado, bloco.id)[0].locked, false);
});

test("blocos novos entram em pilha dentro da area segura", () => {
        const area = { width: 300, height: 400, inset: 20 };
        const primeiro = addTextBlock([], "title", area);
        const segundo = addTextBlock(primeiro, "text", area);

        assert.equal(segundo[0].id, "block-1");
        assert.equal(segundo[0].x, 20 + DEFAULT_TEXT_BLOCK_OFFSET);
        assert.equal(segundo[0].width, 300 - (20 + DEFAULT_TEXT_BLOCK_OFFSET) - 20);
        assert.equal(segundo[1].y, segundo[0].y + DEFAULT_TEXT_BLOCK_HEIGHT + DEFAULT_TEXT_BLOCK_GAP);
        assert.equal(nextTextBlockId(segundo), "block-3");
        assert.ok(segundo.every((bloco) => bloco.y + bloco.height <= 400 - 20));

        const semPrimeiro = segundo.slice(1);
        const novoId = nextTextBlockId(semPrimeiro);
        assert.ok(semPrimeiro.every((bloco) => bloco.id !== novoId));
        assert.equal(addTextBlock(semPrimeiro, "text", area).at(-1).id, novoId);
});

test("remover todos os blocos devolve a pagina aos campos", () => {
        const draft = createDraft();
        const poema = poemPages(draft.doc)[0];
        const comBloco = setPoemBlocks(draft.doc, poema.id, [bloco]);
        const semBloco = setPoemBlocks(comBloco, poema.id, []);

        assert.equal("blocks" in poemPages(semBloco)[0], false);
});

test("a pagina com blocos ignora os campos e preserva a ordem", () => {
        const blocos = [
                {
                        ...bloco,
                        id: "bloco-titulo",
                        text: "Título do bloco",
                        x: 20,
                        y: 20,
                        z: 0,
                },
                {
                        ...bloco,
                        id: "bloco-texto",
                        kind: "text",
                        text: "corpo posicionado",
                        x: 20,
                        y: 100,
                        z: 1,
                },
        ];
        const [layout] = layoutPanelElements(
                { title: "ignorado", subtitle: "", date: "", body: "ignorado", blocks: blocos },
                fonts,
                400,
                300
        );
        const textos = layout.elements.filter(
                (element) =>
                        element.type === "text" &&
                        element.content.lines.some((line) => line.text !== "")
        );

        assert.deepEqual(
                textos.map((element) => element.content.lines.map((line) => line.text).join(" ")),
                ["Título do bloco", "corpo posicionado"]
        );
        assert.deepEqual(textos.map((element) => element.z), [0, 1]);
        assert.equal(toPanelPageLayout(layout).header, true);
});

test("a camada do bloco comanda a ordem do layout", () => {
        const blocos = [
                { ...bloco, id: "frente", z: 2, text: "frente" },
                { ...bloco, id: "fundo", z: 0, text: "fundo" },
                { ...bloco, id: "meio", z: 1, text: "meio" },
        ];
        const [layout] = layoutPanelElements(
                { title: "", subtitle: "", date: "", body: "", blocks: blocos },
                fonts,
                400,
                300
        );
        const ordenados = [...layout.elements]
                .filter((element) => element.id)
                .sort((a, b) => a.z - b.z);

        assert.deepEqual(ordenados.map((element) => element.id), ["fundo", "meio", "frente"]);
});

test("z e trava sobrevivem a salvar e recarregar", () => {
        const draft = createDraft();
        const poema = poemPages(draft.doc)[0];
        const blocos = [{ ...bloco, z: 4, locked: true }];
        const salvo = setPoemBlocks(draft.doc, poema.id, blocos);
        const recarregado = parseDraft(serializeDraft({ ...draft, doc: salvo }));

        assert.deepEqual(poemPages(recarregado.doc)[0].blocks, blocos);
});

test("pagina em branco gera um layout valido sem texto desenhado", () => {
        const [layout] = layoutPanelElements(
                { title: "", subtitle: "", date: "", body: "" },
                fonts,
                400,
                300
        );

        assert.deepEqual(panelDrawables(layout), []);
        assert.equal(toPanelPageLayout(layout).header, false);
});

test("texto em bloco conta como conteudo da pagina", () => {
        const draft = createDraft();
        const poema = poemPages(draft.doc)[0];
        const comBloco = {
                ...draft,
                doc: setPoemBlocks(draft.doc, poema.id, [
                        { ...bloco, text: "Título escrito no bloco" },
                ]),
        };

        assert.equal(hasPoemContent(comBloco), true);
        assert.ok(!draftIssues(comBloco).some((issue) => issue.id === "empty-pages"));
        assert.ok(!draftIssues(comBloco).some((issue) => issue.id === "untitled-poems"));
});
