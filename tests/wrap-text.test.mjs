import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { wrapText } from "../src/lib/wrap-text.ts";

const pdfDoc = await PDFDocument.create();
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

const widthOf = (line) => font.widthOfTextAtSize(line, 12);
const MAX_WIDTH = 200;

function assertFits(lines) {
	for (const line of lines) {
		assert.ok(
			widthOf(line) <= MAX_WIDTH,
			`linha excede a margem (${widthOf(line).toFixed(1)} > ${MAX_WIDTH}): ${line}`
		);
	}
}

test("quebra por palavra respeitando a largura", () => {
	const text = "uma frase razoavelmente longa que precisa ser dividida em varias linhas";

	const lines = wrapText(text, font, 12, MAX_WIDTH);

	assert.ok(lines.length > 1);
	assertFits(lines);
	assert.equal(lines.join(" "), text);
});

test("palavra maior que a linha e quebrada por caractere", () => {
	const long = "https://exemplo.com/um/caminho/muito/longo/sem/espacos/nenhum/aqui";

	const lines = wrapText(long, font, 12, MAX_WIDTH);

	assert.ok(lines.length > 1, "deveria quebrar em varias linhas");
	assertFits(lines);
	assert.equal(lines.join(""), long, "a quebra nao pode perder caractere");
});

test("palavra longa apos texto curto nao estoura a margem", () => {
	const text = "veja https://exemplo.com/caminho/extremamente/longo/sem/quebra/alguma";

	const lines = wrapText(text, font, 12, MAX_WIDTH);

	assertFits(lines);
	assert.equal(lines.join(" ").replace(/ /g, ""), text.replace(/ /g, ""));
});

test("linha vazia entre estrofes e preservada", () => {
	const text = "primeira estrofe\n\nsegunda estrofe";

	const lines = wrapText(text, font, 12, MAX_WIDTH);

	assert.deepEqual(lines, ["primeira estrofe", "", "segunda estrofe"]);
});

test("quebras manuais continuam preservadas", () => {
	const text = "verso um\nverso dois\nverso tres";

	const lines = wrapText(text, font, 12, MAX_WIDTH);

	assert.deepEqual(lines, ["verso um", "verso dois", "verso tres"]);
});

test("texto vazio produz uma linha em branco, igual ao paragrafo vazio", () => {
	assert.deepEqual(wrapText("", font, 12, MAX_WIDTH), [""]);
});

test("palavra que cabe exatamente nao e quebrada", () => {
	const word = "abc";
	const exact = font.widthOfTextAtSize(word, 12);

	const lines = wrapText(word, font, 12, exact);

	assert.deepEqual(lines, [word]);
});
