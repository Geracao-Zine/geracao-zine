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
	PANEL_HEIGHT,
	POEM_DIVIDER_COLOR,
	POEM_DIVIDER_THICKNESS,
	POEM_GAP_AFTER_HEADER,
} from "./layout.ts";
import type { PanelFonts, PanelRun } from "./panel.ts";
import { layoutPanel } from "./panel.ts";
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

	// ---------- PAGINAS DO ZINE ----------
	const fonts: PanelFonts = {
		title: titleFonts.bold,
		subtitle: titleFonts.regular,
		date: titleFonts.regular,
		body: titleFonts.italic,
	};

	for (const poem of input.poems) {
		const layouts = layoutPanel(poem, fonts, PANEL_HEIGHT, contentWidth);

		for (const layout of layouts) {
			const page = pdfDoc.addPage([width, height]);
			const top = height - margin;

			for (const run of layout.runs) {
				page.drawText(run.text, {
					x: margin,
					y: top - run.baseline,
					size: run.size,
					font: fontOf(run, fonts),
					color: rgb(run.color, run.color, run.color),
				});
			}

			// Divisoria entre o cabecalho e a caixa do texto. Sem
			// cabecalho nao ha o que separar.
			if (layout.header) {
				const dividerY = top - (layout.box.top - POEM_GAP_AFTER_HEADER / 2);
				page.drawLine({
					start: { x: margin, y: dividerY },
					end: { x: width - margin, y: dividerY },
					thickness: POEM_DIVIDER_THICKNESS,
					color: rgb(
						POEM_DIVIDER_COLOR,
						POEM_DIVIDER_COLOR,
						POEM_DIVIDER_COLOR
					),
				});
			}
		}
	}

	return pdfDoc.save();
}

function fontOf(run: PanelRun, fonts: PanelFonts): PanelFonts["body"] {
	if (run.role === "title") {
		return fonts.title;
	}

	if (run.role === "body") {
		return fonts.body;
	}

	return run.role === "date" || run.role === "label" ? fonts.date : fonts.subtitle;
}
