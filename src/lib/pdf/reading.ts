import { fontById } from "../fonts.ts";
import { wrapText } from "../wrap-text.ts";
import { embedZineFonts } from "./fonts.ts";
import {
	A4,
	A4_CONTENT_WIDTH,
	COVER_AUTHOR_SIZE,
	COVER_DATE_COLOR,
	COVER_DATE_SIZE,
	COVER_DIVIDER_COLOR,
	COVER_DIVIDER_THICKNESS,
	COVER_DIVIDER_WIDTH,
	COVER_GAP_AUTHOR_TO_DATE,
	COVER_GAP_TITLE_TO_AUTHOR,
	COVER_TITLE_LINE_HEIGHT,
	COVER_TITLE_SIZE,
	POEM_BLANK_LINE_HEIGHT,
	POEM_BODY_COLOR,
	POEM_BODY_SIZE,
	POEM_DIVIDER_COLOR,
	POEM_DIVIDER_THICKNESS,
	POEM_GAP_AFTER_DIVIDER,
	POEM_GAP_AFTER_TITLE,
	POEM_LINE_HEIGHT,
	POEM_TITLE_LINE_HEIGHT,
	POEM_TITLE_SIZE,
} from "./layout.ts";
import type { ReadingPdfInput } from "./types.ts";

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

	const titleLines = wrapText(input.coverTitle, titleFonts.bold, COVER_TITLE_SIZE, contentWidth);
	const titleBlockHeight = titleLines.length * COVER_TITLE_LINE_HEIGHT;
	const temAutor = Boolean(input.authorName);
	const temData = Boolean(input.date);

	// Blocos vazios nao entram na conta: sem isso a capa sem data ficaria
	// deslocada para cima, com o espaco da data reservado no vazio.
	const authorBlockHeight = temAutor
		? COVER_AUTHOR_SIZE + (temData ? COVER_GAP_AUTHOR_TO_DATE + COVER_DATE_SIZE : 0)
		: 0;
	const totalBlockHeight =
		titleBlockHeight +
		COVER_GAP_TITLE_TO_AUTHOR +
		authorBlockHeight +
		(temData ? COVER_DATE_SIZE : 0);

	let cursorY = height / 2 + totalBlockHeight / 2;

	for (const line of titleLines) {
		const lineWidth = titleFonts.bold.widthOfTextAtSize(line, COVER_TITLE_SIZE);
		coverPage.drawText(line, {
			x: (width - lineWidth) / 2,
			y: cursorY,
			size: COVER_TITLE_SIZE,
			font: titleFonts.bold,
		});
		cursorY -= COVER_TITLE_LINE_HEIGHT;
	}

	cursorY -= COVER_GAP_TITLE_TO_AUTHOR / 2;
	coverPage.drawLine({
		start: { x: (width - COVER_DIVIDER_WIDTH) / 2, y: cursorY },
		end: { x: (width + COVER_DIVIDER_WIDTH) / 2, y: cursorY },
		thickness: COVER_DIVIDER_THICKNESS,
		color: rgb(COVER_DIVIDER_COLOR, COVER_DIVIDER_COLOR, COVER_DIVIDER_COLOR),
	});
	cursorY -= COVER_GAP_TITLE_TO_AUTHOR / 2;

	if (temAutor) {
		const authorWidth = authorFonts.regular.widthOfTextAtSize(input.authorName, COVER_AUTHOR_SIZE);
		coverPage.drawText(input.authorName, {
			x: (width - authorWidth) / 2,
			y: cursorY,
			size: COVER_AUTHOR_SIZE,
			font: authorFonts.regular,
		});
		cursorY -= temData ? COVER_GAP_AUTHOR_TO_DATE + COVER_DATE_SIZE : 0;
	}

	if (temData) {
		const dateWidth = titleFonts.regular.widthOfTextAtSize(input.date, COVER_DATE_SIZE);
		coverPage.drawText(input.date, {
			x: (width - dateWidth) / 2,
			y: cursorY,
			size: COVER_DATE_SIZE,
			font: titleFonts.regular,
			color: rgb(COVER_DATE_COLOR, COVER_DATE_COLOR, COVER_DATE_COLOR),
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
			y -= POEM_TITLE_LINE_HEIGHT;
		}

		y -= POEM_GAP_AFTER_TITLE;
		page.drawLine({
			start: { x: margin, y },
			end: { x: width - margin, y },
			thickness: POEM_DIVIDER_THICKNESS,
			color: rgb(POEM_DIVIDER_COLOR, POEM_DIVIDER_COLOR, POEM_DIVIDER_COLOR),
		});
		y -= POEM_GAP_AFTER_DIVIDER;

		const bodyLines = wrapText(poem.poetry, titleFonts.italic, POEM_BODY_SIZE, contentWidth);

		for (const line of bodyLines) {
			if (y < bottomLimit) {
				page = pdfDoc.addPage([width, height]);
				y = topStart;
			}

			if (line === "") {
				y -= POEM_BLANK_LINE_HEIGHT;
				continue;
			}

			page.drawText(line, {
				x: margin,
				y,
				size: POEM_BODY_SIZE,
				font: titleFonts.italic,
				color: rgb(POEM_BODY_COLOR, POEM_BODY_COLOR, POEM_BODY_COLOR),
			});
			y -= POEM_LINE_HEIGHT;
		}
	}

	return pdfDoc.save();
}
