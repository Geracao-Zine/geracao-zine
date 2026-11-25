import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";

const {
        DEFAULT_SHAPE_HEIGHT,
        DEFAULT_SHAPE_THICKNESS,
        DEFAULT_SHAPE_WIDTH,
        MAX_SHAPE_THICKNESS,
        MIN_SHAPE_THICKNESS,
        addPage,
        addShapeBlock,
        createDraft,
        createShapeBlock,
        parseDraft,
        removeShapeBlock,
        serializeDraft,
        setPoemShapes,
        shapeBlockFrom,
        shapeBlocksFrom,
        updateShapeBlock,
} = await import("../src/domain/index.ts");
const { shapeBlockRect, shapePoints } = await import("../src/lib/shape-geometry.ts");
const { layoutPanelElements } = await import("../src/lib/pdf/panel.ts");
const { panelDrawables } = await import("../src/lib/pdf/panel-render.ts");
const { layoutPreview } = await import("../src/lib/preview/index.ts");
const { generateZinePdf } = await import("../src/lib/pdf/zine.ts");

const pdfDoc = await PDFDocument.create();
const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
const fonts = { title: bold, subtitle: regular, date: regular, body: regular };

const pagina = {
        title: "Com formas",
        subtitle: "",
        date: "",
        body: "um verso",
};

const forma = {
        id: "shape-1",
        kind: "rect",
        x: 40,
        y: 30,
        width: 120,
        height: 60,
        thickness: 2,
        color: 0.3,
        z: 4,
        locked: false,
};

test("a forma preserva geometria, traco e cor ao ser lida", () => {
        assert.deepEqual(shapeBlockFrom(forma, "fallback"), forma);
});

test("campos invalidos caem no padrao sem descartar a forma", () => {
        const lida = shapeBlockFrom(
                {
                        id: "",
                        kind: "circulo",
                        x: "x",
                        y: null,
                        width: -5,
                        height: 0,
                        thickness: 99,
                        color: -1,
                },
                "fallback"
        );

        assert.equal(lida.id, "fallback");
        assert.equal(lida.kind, "line");
        assert.equal(lida.x, 0);
        assert.equal(lida.y, 0);
        assert.equal(lida.width, 1);
        assert.equal(lida.height, 1);
        assert.equal(lida.thickness, MAX_SHAPE_THICKNESS);
        assert.equal(lida.color, 0);
});

test("formas repetidas ou invalidas nao entram na pagina", () => {
        const lidas = shapeBlocksFrom([
                { id: "a", kind: "line" },
                { id: "a", kind: "arc" },
                "invalida",
                { id: "b", kind: "rect" },
        ]);

        assert.deepEqual(
                lidas.map((item) => item.id),
                ["a", "b"]
        );
});

test("adicionar forma coloca acima do conteudo e dentro do painel", () => {
        const formas = addShapeBlock([], "arc", { width: 400, height: 600, inset: 20 }, 3);

        assert.equal(formas.length, 1);
        assert.equal(formas[0].z, 3);
        assert.equal(formas[0].kind, "arc");
        assert.ok(formas[0].x >= 20);
        assert.ok(formas[0].y >= 20);
        assert.ok(formas[0].x + formas[0].width <= 380);
        assert.ok(formas[0].y + formas[0].height <= 580);
});

test("espessura, cor e tamanho respeitam os limites", () => {
        const [fina] = updateShapeBlock([createShapeBlock("line", "shape-1")], "shape-1", {
                thickness: 0,
                color: 2,
                width: -5,
                height: 0,
        });
        const [grossa] = updateShapeBlock([createShapeBlock("line", "shape-1")], "shape-1", {
                thickness: 99,
                color: -1,
        });

        assert.equal(fina.thickness, MIN_SHAPE_THICKNESS);
        assert.equal(fina.color, 1);
        assert.equal(fina.width, 1);
        assert.equal(fina.height, 1);
        assert.equal(grossa.thickness, MAX_SHAPE_THICKNESS);
        assert.equal(grossa.color, 0);
        assert.deepEqual(removeShapeBlock([fina], "shape-1"), []);
});

test("formas sobrevivem ao rascunho salvo", () => {
        const draft = createDraft();
        const doc = addPage(draft.doc);
        const id = doc.pages[1].id;
        const comFormas = setPoemShapes(doc, id, [forma]);
        const lido = parseDraft(serializeDraft({ ...draft, doc: comFormas }));

        assert.deepEqual(lido?.doc.pages[1].shapes, [forma]);
});

test("linha, retangulo e arco usam a mesma geometria no preview e no PDF", () => {
        const formas = [
                { ...createShapeBlock("line", "linha"), x: 10, y: 10, width: 100, height: 50, z: 1 },
                { ...createShapeBlock("rect", "retangulo"), x: 30, y: 40, width: 80, height: 30, z: 2 },
                { ...createShapeBlock("arc", "arco"), x: 50, y: 60, width: 90, height: 45, z: 3 },
        ];
        const preview = layoutPreview(
                pagina,
                fonts,
                { width: 400, height: 600 },
                0,
                null,
                [],
                formas
        );
        const pdf = layoutPanelElements(
                { ...pagina, shapes: formas },
                fonts,
                600,
                400,
                0,
                null
        );

        assert.deepEqual(preview, pdf);

        const desenhos = panelDrawables(preview[0]).filter((item) => item.kind === "shape");
        assert.deepEqual(
                desenhos.map((item) => item.shape),
                ["line", "rect", "arc"]
        );
        assert.ok(desenhos.every((item) => item.z > 0));
});

test("o arco comeca a oeste, sobe e termina a leste", () => {
        const rect = { x: 10, y: 20, width: 100, height: 40 };
        const pontos = shapePoints("arc", rect);
        const meio = pontos[Math.floor(pontos.length / 2)];

        const perto = (atual, esperado) => assert.ok(Math.abs(atual - esperado) < 1e-9);

        perto(pontos[0].x, 10);
        perto(pontos[0].y, 40);
        perto(pontos[pontos.length - 1].x, 110);
        perto(pontos[pontos.length - 1].y, 40);
        perto(meio.x, 60);
        perto(meio.y, 20);
});

test("o retangulo fecha o traco no ponto de partida", () => {
        const pontos = shapePoints("rect", { x: 5, y: 6, width: 30, height: 20 });

        assert.equal(pontos.length, 5);
        assert.deepEqual(pontos[0], pontos[4]);
});

test("a forma e recortada para dentro do painel", () => {
        const recorte = shapeBlockRect(
                { ...createShapeBlock("line", "shape-1"), x: -20, y: 590, width: 500, height: 50 },
                400,
                600
        );

        assert.equal(recorte.x, 0);
        assert.equal(recorte.y, 550);
        assert.equal(recorte.width, 400);
        assert.equal(recorte.height, 50);
});

test("formas aparecem no PDF gerado", async () => {
        const bytes = await generateZinePdf({
                coverTitle: "Zine com formas",
                authorName: "Steve",
                titleFont: "geistMono",
                authorFont: "geistSans",
                date: "19/11/2026",
                format: "banner-a4",
                printMode: "simplex",
                poems: [{ ...pagina, shapes: [forma] }],
        });
        const doc = await PDFDocument.load(bytes);

        assert.equal(doc.getPageCount(), 2);
});

test("a forma usa os padroes de tamanho e traco do dominio", () => {
        const criada = createShapeBlock("line", "shape-1");

        assert.equal(criada.width, DEFAULT_SHAPE_WIDTH);
        assert.equal(criada.height, DEFAULT_SHAPE_HEIGHT);
        assert.equal(criada.thickness, DEFAULT_SHAPE_THICKNESS);
});
