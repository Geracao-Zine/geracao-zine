import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";

const { layoutPanel, layoutPanelElements, toPanelPageLayout } = await import(
        "../src/lib/pdf/panel.ts"
);
const { A4_CONTENT_WIDTH, PANEL_HEIGHT } = await import("../src/lib/pdf/layout.ts");

const raiz = fileURLToPath(new URL("..", import.meta.url));

const pdfDoc = await PDFDocument.create();
const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

const fonts = { title: bold, subtitle: regular, date: regular, body: regular };

const cheia = {
        title: "Título da página",
        subtitle: "Subtítulo",
        date: "19/11/2026",
        body: "primeiro verso\nsegundo verso",
};

const vazia = { title: "", subtitle: "", date: "", body: "primeiro verso\nsegundo verso" };

const longo = {
        ...cheia,
        body: Array.from({ length: 200 }, (_, i) => `verso ${i + 1}`).join("\n"),
};

test("o layout posicionado expoe retangulo, conteudo e ordem de empilhamento", () => {
        const [layout] = layoutPanelElements(cheia, fonts);

        assert.equal(layout.width, A4_CONTENT_WIDTH);
        assert.equal(layout.height, PANEL_HEIGHT);
        assert.ok(layout.elements.length >= 5);

        for (const [index, element] of layout.elements.entries()) {
                assert.ok(element.type === "text" || element.type === "rule");
                assert.equal(element.z, index);

                for (const medida of ["x", "y", "width", "height"]) {
                        assert.equal(typeof element.rect[medida], "number");
                }

                assert.equal(typeof element.content, "object");
        }

        const roles = layout.elements
                .filter((element) => element.type === "text")
                .map((element) => element.content.role);

        assert.deepEqual(roles, ["title", "subtitle", "date", "body"]);

        const rule = layout.elements.find((element) => element.type === "rule");
        assert.ok(rule);
        assert.equal(rule.rect.height, rule.content.thickness);
});

test("as linhas posicionadas ficam dentro do painel", () => {
        const [layout] = layoutPanelElements(cheia, fonts);

        for (const element of layout.elements) {
                if (element.type !== "text") {
                        continue;
                }

                for (const line of element.content.lines) {
                        assert.ok(line.baseline >= 0);
                        assert.ok(line.baseline <= layout.height);
                }
        }
});

test("a conversao reproduz o contrato historico do preview e do PDF", () => {
        const casos = [
                { page: cheia, height: PANEL_HEIGHT, width: A4_CONTENT_WIDTH, inset: 0 },
                { page: vazia, height: PANEL_HEIGHT, width: A4_CONTENT_WIDTH, inset: 0 },
                { page: longo, height: PANEL_HEIGHT, width: A4_CONTENT_WIDTH, inset: 0 },
                { page: cheia, height: PANEL_HEIGHT, width: A4_CONTENT_WIDTH, inset: 40 },
                { page: cheia, height: 10, width: A4_CONTENT_WIDTH, inset: 0 },
        ];

        for (const caso of casos) {
                const elementos = layoutPanelElements(
                        caso.page,
                        fonts,
                        caso.height,
                        caso.width,
                        caso.inset
                );
                const historico = layoutPanel(
                        caso.page,
                        fonts,
                        caso.height,
                        caso.width,
                        caso.inset
                );

                assert.equal(elementos.length, historico.length);

                elementos.forEach((layout, index) => {
                        assert.deepEqual(
                                toPanelPageLayout(layout, caso.inset),
                                historico[index]
                        );
                });
        }
});

test("o tipo posicionado aceita elementos sem PageFields", () => {
        const layout = {
                width: 200,
                height: 100,
                elements: [
                        {
                                type: "rule",
                                rect: { x: 0, y: 50, width: 200, height: 0.5 },
                                content: { color: 0.75, thickness: 0.5 },
                                z: 0,
                        },
                        {
                                type: "text",
                                rect: { x: 0, y: 0, width: 200, height: 20 },
                                content: {
                                        role: "body",
                                        size: 12,
                                        color: 0,
                                        align: "left",
                                        lines: [{ text: "linha", x: 0, baseline: 12 }],
                                },
                                z: 1,
                        },
                ],
        };

        const page = toPanelPageLayout(layout);

        assert.deepEqual(page.runs, [
                { role: "body", text: "linha", size: 12, baseline: 12, color: 0 },
        ]);
        assert.deepEqual(page.box, { top: 0, height: 20 });
        assert.equal(page.header, false);
        assert.equal(page.divider, 50.25);
        assert.equal(page.bodySize, 12);
});

test("o modulo de elementos nao depende de PageFields", () => {
        const fonte = readFileSync(
                join(raiz, "src/lib/pdf/panel-elements.ts"),
                "utf8"
        );

        assert.ok(!/PageFields/.test(fonte));
});
