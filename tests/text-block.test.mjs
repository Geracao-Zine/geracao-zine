import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";

const {
        DEFAULT_TEXT_BLOCK_HEIGHT,
        DEFAULT_TEXT_BLOCK_WIDTH,
        MAX_TEXT_BLOCK_SIZE,
        createDraft,
        createTextBlock,
        parseDraft,
        poemPages,
        serializeDraft,
        textBlockFrom,
        textBlocksFrom,
} = await import("../src/domain/index.ts");
const { layoutTextBlock, textBlockRect } = await import("../src/lib/pdf/text-block.ts");
const { wrapText } = await import("../src/lib/wrap-text.ts");

const pdfDoc = await PDFDocument.create();
const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

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
});
