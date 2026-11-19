import type { PDFDocument, PDFFont } from "pdf-lib";
import type { FontFace } from "../fonts.ts";

export type EmbedResult = {
	regular: PDFFont;
	bold: PDFFont;
	italic: PDFFont;
	embedded: boolean;
};

export type StandardFontNames = {
	regular: string;
	bold: string;
	italic: string;
};

const cache = new Map<string, ArrayBuffer>();

async function fetchFont(path: string): Promise<ArrayBuffer> {
	const cached = cache.get(path);
	if (cached) {
		return cached;
	}

	const response = await fetch(path);
	if (!response.ok) {
		throw new Error(`falha ao carregar ${path}: ${response.status}`);
	}

	const buffer = await response.arrayBuffer();
	cache.set(path, buffer);
	return buffer;
}

// As fontes padrao do PDF cobrem Latin-1, o que inclui toda a acentuacao
// portuguesa, mas nao cirilico, grego ou emoji. O fallback existe para o caso
// de a fonte do cadastro nao poder ser carregada, nao para corrigir acentos.
async function embedStandard(
	pdfDoc: PDFDocument,
	standard: StandardFontNames
): Promise<EmbedResult> {
	return {
		regular: await pdfDoc.embedFont(standard.regular),
		bold: await pdfDoc.embedFont(standard.bold),
		italic: await pdfDoc.embedFont(standard.italic),
		embedded: false,
	};
}

export async function embedZineFonts(
	pdfDoc: PDFDocument,
	face: FontFace,
	standard: StandardFontNames
): Promise<EmbedResult> {
	try {
		const [regular, bold] = await Promise.all([
			fetchFont(face.regular),
			fetchFont(face.bold),
		]);

		return {
			regular: await pdfDoc.embedFont(regular, { subset: true }),
			bold: await pdfDoc.embedFont(bold, { subset: true }),
			italic: await pdfDoc.embedFont(regular, { subset: true }),
			embedded: true,
		};
	} catch {
		return embedStandard(pdfDoc, standard);
	}
}
