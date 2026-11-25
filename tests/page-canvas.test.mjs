import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const canvas = readFileSync(join(raiz, "src/components/PageCanvas/index.tsx"), "utf8");
const selecao = readFileSync(join(raiz, "src/lib/canvas/selection.ts"), "utf8");
const { canDragElement } = await import("../src/lib/canvas/selection.ts");

test("o canvas seleciona o elemento pelo ponteiro", () => {
        assert.match(canvas, /onPointerDown=\{\(\) => selectAt\(null\)\}/);
        assert.match(canvas, /onPointerDown: \(event: ReactPointerEvent\) =>\s*onStart\(event, index, "move"\)/);
});

test("o canvas arrasta e redimensiona com o ponteiro", () => {
        assert.match(canvas, /onPointerMove=\{move\}/);
        assert.match(canvas, /onPointerUp=\{end\}/);
        assert.match(canvas, /moveRect\(current\.startRect, dx, dy, bounds/);
        assert.match(canvas, /resizeRect\(\s*current\.startRect,\s*current\.handle/);
});

test("as oito alcas de redimensionamento existem e sao focaveis", () => {
        for (const alca of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
                assert.ok(selecao.includes(`"${alca}"`), `falta a alca ${alca}`);
        }

        assert.match(canvas, /RESIZE_HANDLES\.map/);
        assert.match(canvas, /tabIndex=\{0\}/);
        assert.match(canvas, /onPointerDown=\{\(event\) =>\s*onStart\(event, selected, "resize", handle\)/);
});

test("o teclado move e redimensiona", () => {
        assert.match(canvas, /keyboardDelta\(event\.key, event\.shiftKey\)/);
        assert.match(canvas, /onKeyboard\(event, index, "move"\)/);
        assert.match(canvas, /onKeyboard\(event, selected, "resize", handle\)/);
});

test("o arraste usa o mesmo encaixe do motor puro", () => {
        assert.match(canvas, /moveRect\(current\.startRect, dx, dy, bounds/);
        assert.match(canvas, /alignmentGuides\(element\.rect, bounds/);
        assert.match(canvas, /DEFAULT_SNAP_THRESHOLD/);
});

test("as guias sao desenhadas nas duas direcoes", () => {
        assert.match(canvas, /guide\.axis === "vertical"/);
        assert.match(canvas, /guide\.axis === "horizontal"/);
});

test("elemento travado nao pode ser arrastado nem redimensionado", () => {
        assert.equal(canDragElement({ locked: true }), false);
        assert.equal(canDragElement({ locked: false }), true);
        assert.match(canvas, /if \(!canDragElement\(element\)\)/);
        assert.match(canvas, /!canDragElement\(layout\.elements\[selected\]\)/);
});

test("alterar um elemento preserva os outros e a ordem de empilhamento", () => {
        assert.match(
                canvas,
                /current === index \? \{ \.\.\.element, rect \} : element/,
                "o canvas nao pode recriar os outros elementos"
        );
});

const review = readFileSync(
        join(raiz, "src/components/ZineWizard/steps/ReviewStep.tsx"),
        "utf8"
);
const preview = readFileSync(join(raiz, "src/components/PoemPreview/index.tsx"), "utf8");

test("a revisao liga o canvas editavel ao preview de cada poesia", () => {
        assert.match(review, /<PoemPreview[\s\S]*?editable/);
        assert.match(preview, /<PageCanvas/);
        assert.match(preview, /const shown = editState\?\.source === pages/);
});
