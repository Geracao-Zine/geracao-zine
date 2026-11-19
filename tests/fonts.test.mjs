import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import { FONTS, resolveFontId, fontById, DEFAULT_FONT_ID } from "../src/lib/fonts.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

// O modulo de fontes usa fetch com caminho absoluto ("/fonts/x.ttf"), que e o
// que o navegador pede. Nos testes servimos o mesmo caminho a partir de public/.
function comFetchDeDisco(sempreFalha) {
	globalThis.fetch = async (url) => {
		if (sempreFalha) {
			return { ok: false, status: 503, arrayBuffer: async () => new ArrayBuffer(0) };
		}

		const buffer = readFileSync(`${root}public${url}`);
		const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

		return { ok: true, arrayBuffer: async () => bytes };
	};
}

test("todas as fontes do registro existem no disco", () => {
	for (const font of FONTS) {
		for (const path of [font.regular, font.bold]) {
			assert.ok(
				existsSync(`${root}public${path}`),
				`arquivo ausente: public${path}`
			);
		}
	}
});

test("os arquivos de fonte sao TTF validos", () => {
	for (const font of FONTS) {
		for (const path of [font.regular, font.bold]) {
			const head = readFileSync(`${root}public${path}`).subarray(0, 4).toString("hex");

			assert.ok(
				["00010000", "4f54544f"].includes(head),
				`${path} nao parece um TTF (cabecalho ${head})`
			);
		}
	}
});

test("resolveFontId aceita o id do registro", () => {
	assert.equal(resolveFontId("geistSans"), "geistSans");
	assert.equal(resolveFontId("geistMono"), "geistMono");
});

test("resolveFontId aceita a classe CSS enviada pelo cadastro", () => {
	assert.equal(resolveFontId("font-sans"), "geistSans");
	assert.equal(resolveFontId("font-mono"), "geistMono");
});

test("resolveFontId cai no padrao para valor desconhecido ou vazio", () => {
	assert.equal(resolveFontId(null), DEFAULT_FONT_ID);
	assert.equal(resolveFontId(undefined), DEFAULT_FONT_ID);
	assert.equal(resolveFontId(""), DEFAULT_FONT_ID);
	assert.equal(resolveFontId("comic-sans"), DEFAULT_FONT_ID);
});

test("fontById devolve a face correspondente", () => {
	assert.equal(fontById("geistMono").className, "font-mono");
	assert.equal(fontById("geistSans").regular, "/fonts/geist-regular.ttf");
});

test("cada fonte do registro e embutivel e aceita acentuacao", async () => {
	for (const font of FONTS) {
		const pdfDoc = await PDFDocument.create();
		pdfDoc.registerFontkit(fontkit);

		const regular = await pdfDoc.embedFont(
			readFileSync(`${root}public${font.regular}`),
			{ subset: true }
		);
		const bold = await pdfDoc.embedFont(
			readFileSync(`${root}public${font.bold}`),
			{ subset: true }
		);

		const page = pdfDoc.addPage([300, 200]);
		const amostra = "coração, ação, linguiça, avó, São Paulo";

		page.drawText(amostra, { x: 10, y: 100, size: 12, font: regular });
		page.drawText(amostra, { x: 10, y: 80, size: 12, font: bold });

		assert.ok(regular.widthOfTextAtSize(amostra, 12) > 0);
		assert.ok(bold.widthOfTextAtSize(amostra, 12) > 0);
	}
});

test("a fonte embutida aceita caracteres fora do Latin-1", async () => {
	const pdfDoc = await PDFDocument.create();
	pdfDoc.registerFontkit(fontkit);
	const font = await pdfDoc.embedFont(
		readFileSync(`${root}public/fonts/geist-regular.ttf`),
		{ subset: true }
	);
	const page = pdfDoc.addPage([300, 200]);

	for (const char of ["ł", "→", "α", "Ж", "★"]) {
		page.drawText(char, { x: 10, y: 100, size: 12, font });
	}
});

const PADRAO = {
        regular: StandardFonts.Helvetica,
        bold: StandardFonts.HelveticaBold,
        italic: StandardFonts.HelveticaOblique,
};

test("embedZineFonts embute a fonte quando o arquivo existe", async () => {
	comFetchDeDisco(false);

	const { embedZineFonts } = await import("../src/lib/pdf/fonts.ts");
	const pdfDoc = await PDFDocument.create();
	pdfDoc.registerFontkit(fontkit);

	const result = await embedZineFonts(pdfDoc, fontById("geistSans"), PADRAO);

	assert.equal(result.embedded, true);
	assert.ok(result.regular.widthOfTextAtSize("coração", 12) > 0);
});

test("embedZineFonts cai na fonte padrao quando o download falha", async () => {
	comFetchDeDisco(true);

	const { embedZineFonts } = await import("../src/lib/pdf/fonts.ts");
	const pdfDoc = await PDFDocument.create();
	pdfDoc.registerFontkit(fontkit);

	const result = await embedZineFonts(pdfDoc, fontById("geistMono"), PADRAO);

	assert.equal(result.embedded, false);

	const page = pdfDoc.addPage([300, 200]);
	page.drawText("coração ação linguiça", { x: 10, y: 100, size: 12, font: result.regular });
});
