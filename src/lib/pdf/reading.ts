import { fontById } from "../fonts.ts";
import { wrapText } from "../wrap-text.ts";
import { embedZineFonts } from "./fonts.ts";
import { A4, A4_CONTENT_WIDTH } from "./types.ts";
import type { ReadingPdfInput } from "./types.ts";

const TITLE_SIZE = 30;
const TITLE_LINE_HEIGHT = 38;
const AUTHOR_SIZE = 14;
const DATE_SIZE = 10;
const GAP_TITLE_TO_AUTHOR = 40;
const GAP_AUTHOR_TO_DATE = 10;
const DIVIDER_WIDTH = 60;

const POEM_TITLE_SIZE = 20;
const POEM_BODY_SIZE = 13;
const POEM_LINE_HEIGHT = 22;

export async function generateReadingPdf(
	input: ReadingPdfInput
): Promise<Uint8Array> {
	// pdf-lib e fontkit entram so aqui: nada disso vai para o bundle inicial.
	const [{ PDFDocument, StandardFonts, rgb }, fontkit] = await Promise.all([
		import("pdf-lib"),
		import("@pdf-lib/fontkit").then((mod) => mod.default),
	]);

	const pdfDoc = await PDFDocument.create();
	pdfDoc.registerFontkit(fontkit);

	const standard = {
		regular: StandardFonts.Helvetica,
		bold: StandardFonts.HelveticaBold,
		italic: StandardFonts.HelveticaOblique,
	};

	const titleFonts = await embedZineFonts(pdfDoc, fontById(input.titleFont), standard);
	const authorFonts = await embedZineFonts(pdfDoc, fontById(input.authorFont), standard);

	const { width, height, margin } = A4;
	const contentWidth = A4_CONTENT_WIDTH;

	// ---------- CAPA ----------
	const coverPage = pdfDoc.addPage([width, height]);

	const titleLines = wrapText(input.coverTitle, titleFonts.bold, TITLE_SIZE, contentWidth);
	const titleBlockHeight = titleLines.length * TITLE_LINE_HEIGHT;
	const temAutor = Boolean(input.authorName);
	const temData = Boolean(input.date);

	// Blocos vazios nao entram na conta: sem isso a capa sem data ficaria
	// deslocada para cima, com o espaco da data reservado no vazio.
	const authorBlockHeight = temAutor
		? AUTHOR_SIZE + (temData ? GAP_AUTHOR_TO_DATE + DATE_SIZE : 0)
		: 0;
	const totalBlockHeight =
		titleBlockHeight +
		GAP_TITLE_TO_AUTHOR +
		authorBlockHeight +
		(temData ? DATE_SIZE : 0);

	let cursorY = height / 2 + totalBlockHeight / 2;

	for (const line of titleLines) {
		const lineWidth = titleFonts.bold.widthOfTextAtSize(line, TITLE_SIZE);
		coverPage.drawText(line, {
			x: (width - lineWidth) / 2,
			y: cursorY,
			size: TITLE_SIZE,
			font: titleFonts.bold,
		});
		cursorY -= TITLE_LINE_HEIGHT;
	}

	cursorY -= GAP_TITLE_TO_AUTHOR / 2;
	coverPage.drawLine({
		start: { x: (width - DIVIDER_WIDTH) / 2, y: cursorY },
		end: { x: (width + DIVIDER_WIDTH) / 2, y: cursorY },
		thickness: 1,
		color: rgb(0.6, 0.6, 0.6),
	});
	cursorY -= GAP_TITLE_TO_AUTHOR / 2;

	if (temAutor) {
		const authorWidth = authorFonts.regular.widthOfTextAtSize(input.authorName, AUTHOR_SIZE);
		coverPage.drawText(input.authorName, {
			x: (width - authorWidth) / 2,
			y: cursorY,
			size: AUTHOR_SIZE,
			font: authorFonts.regular,
		});
		cursorY -= temData ? GAP_AUTHOR_TO_DATE + DATE_SIZE : 0;
	}

	if (temData) {
		const dateWidth = titleFonts.regular.widthOfTextAtSize(input.date, DATE_SIZE);
		coverPage.drawText(input.date, {
			x: (width - dateWidth) / 2,
			y: cursorY,
			size: DATE_SIZE,
			font: titleFonts.regular,
			color: rgb(0.5, 0.5, 0.5),
		});
	}

	// ---------- PAGINAS DE POEMA ----------
	const topStart = height - margin;
	const bottomLimit = margin;

	for (const poem of input.poems) {
		let page = pdfDoc.addPage([width, height]);
		let y = topStart;

		const poemTitleLines = wrapText(poem.title, titleFonts.bold, POEM_TITLE_SIZE, contentWidth);
		for (const line of poemTitleLines) {
			page.drawText(line, {
				x: margin,
				y,
				size: POEM_TITLE_SIZE,
				font: titleFonts.bold,
			});
			y -= POEM_TITLE_SIZE + 6;
		}

		y -= 6;
		page.drawLine({
			start: { x: margin, y },
			end: { x: width - margin, y },
			thickness: 0.5,
			color: rgb(0.75, 0.75, 0.75),
		});
		y -= 30;

		const bodyLines = wrapText(poem.poetry, titleFonts.italic, POEM_BODY_SIZE, contentWidth);

		for (const line of bodyLines) {
			if (y < bottomLimit) {
				page = pdfDoc.addPage([width, height]);
				y = topStart;
			}

			if (line === "") {
				y -= POEM_LINE_HEIGHT / 2;
				continue;
			}

			page.drawText(line, {
				x: margin,
				y,
				size: POEM_BODY_SIZE,
				font: titleFonts.italic,
				color: rgb(0.15, 0.15, 0.15),
			});
			y -= POEM_LINE_HEIGHT;
		}
	}

	return pdfDoc.save();
}
