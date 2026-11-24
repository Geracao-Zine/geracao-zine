import { test } from "node:test";
import assert from "node:assert/strict";

const {
        DEFAULT_SNAP_THRESHOLD,
        MIN_ELEMENT_SIZE,
        alignmentGuides,
        clampRect,
        keyboardDelta,
        keyboardStep,
        moveRect,
        panelTargets,
        resizeRect,
} = await import("../src/lib/canvas/selection.ts");

const bounds = { width: 300, height: 600 };
const inset = 10;
const options = { inset, threshold: DEFAULT_SNAP_THRESHOLD };

test("as guias do painel ficam nas margens e no centro", () => {
        assert.deepEqual(panelTargets(bounds, inset), {
                x: [10, 150, 290],
                y: [10, 300, 590],
        });
});

test("sem margem de seguranca as guias encostam nas bordas", () => {
        assert.deepEqual(panelTargets(bounds), {
                x: [0, 150, 300],
                y: [0, 300, 600],
        });
});

test("o retangulo nunca sai da area imprimivel", () => {
        assert.deepEqual(clampRect({ x: -40, y: 900, width: 500, height: 50 }, bounds, inset), {
                x: 10,
                y: 540,
                width: 280,
                height: 50,
        });
});

test("arrastar encaixa a borda esquerda na margem e mostra a guia", () => {
        const result = moveRect({ x: 12, y: 100, width: 80, height: 40 }, 0, 0, bounds, options);

        assert.equal(result.rect.x, 10);
        assert.deepEqual(result.guides, [{ axis: "vertical", position: 10 }]);
});

test("arrastar encaixa o centro do bloco no centro do painel", () => {
        const result = moveRect({ x: 102, y: 100, width: 100, height: 40 }, 0, 0, bounds, options);

        assert.equal(result.rect.x + result.rect.width / 2, 150);
        assert.deepEqual(result.guides, [{ axis: "vertical", position: 150 }]);
});

test("arrastar encaixa as duas bordas quando chega perto do canto", () => {
        const result = moveRect({ x: 12, y: 12, width: 80, height: 40 }, 0, 0, bounds, options);

        assert.equal(result.rect.x, 10);
        assert.equal(result.rect.y, 10);
        assert.deepEqual(result.guides, [
                { axis: "vertical", position: 10 },
                { axis: "horizontal", position: 10 },
        ]);
});

test("redimensionar pela alca leste preserva a borda esquerda e encaixa a direita", () => {
        const result = resizeRect(
                { x: 10, y: 100, width: 100, height: 40 },
                "e",
                38,
                0,
                bounds,
                options
        );

        assert.equal(result.rect.x, 10);
        assert.equal(result.rect.width, 140);
        assert.deepEqual(result.guides, [{ axis: "vertical", position: 150 }]);
});

test("redimensionar pela alca oeste preserva a borda direita", () => {
        const result = resizeRect(
                { x: 12, y: 100, width: 100, height: 40 },
                "w",
                -1,
                0,
                bounds,
                options
        );

        assert.equal(result.rect.x, 10);
        assert.equal(result.rect.width, 102);
        assert.deepEqual(result.guides, [{ axis: "vertical", position: 10 }]);
});

test("redimensionar nunca deixa o elemento menor que o minimo", () => {
        const result = resizeRect(
                { x: 20, y: 100, width: 100, height: 40 },
                "e",
                -1000,
                0,
                bounds,
                options
        );

        assert.equal(result.rect.width, MIN_ELEMENT_SIZE);
        assert.equal(result.rect.x, 20);
});

test("redimensionar pelo canto move os dois eixos", () => {
        const result = resizeRect(
                { x: 10, y: 10, width: 100, height: 40 },
                "se",
                30,
                20,
                bounds,
                options
        );

        assert.equal(result.rect.width, 130);
        assert.equal(result.rect.height, 60);
});

test("guias aparecem quando o bloco esta alinhado a margem", () => {
        assert.deepEqual(alignmentGuides({ x: 10, y: 20, width: 100, height: 40 }, bounds, options), [
                { axis: "vertical", position: 10 },
        ]);
});

test("setas movem um ponto e Shift acelera", () => {
        assert.deepEqual(keyboardDelta("ArrowLeft"), { dx: -1, dy: 0 });
        assert.deepEqual(keyboardDelta("ArrowDown", true), { dx: 0, dy: 10 });
        assert.equal(keyboardDelta("Enter"), null);
        assert.equal(keyboardStep(), 1);
        assert.equal(keyboardStep(true), 10);
});

test("teclado usa o mesmo encaixe do arraste", () => {
        const result = moveRect({ x: 11, y: 100, width: 80, height: 40 }, 0, 0, bounds, options);

        assert.equal(result.rect.x, 10);
        assert.deepEqual(result.guides, [{ axis: "vertical", position: 10 }]);
});
