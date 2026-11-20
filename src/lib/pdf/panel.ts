import type { PDFFont } from "pdf-lib";
import type { PageFields } from "../../domain/page.ts";
import { wrapText } from "../wrap-text.ts";
import {
	A4_CONTENT_WIDTH,
	PANEL_HEIGHT,
	POEM_BLANK_LINE_HEIGHT,
	POEM_BODY_COLOR,
	POEM_BODY_SIZE,
	POEM_CONTINUATION_LABEL,
	POEM_DATE_COLOR,
	POEM_DATE_LINE_HEIGHT,
	POEM_DATE_SIZE,
	POEM_GAP_AFTER_DATE,
	POEM_GAP_AFTER_HEADER,
	POEM_GAP_AFTER_SUBTITLE,
	POEM_GAP_AFTER_TITLE,
	POEM_LINE_HEIGHT,
	POEM_SUBTITLE_LINE_HEIGHT,
	POEM_SUBTITLE_SIZE,
	POEM_TITLE_LINE_HEIGHT,
	POEM_TITLE_SIZE,
} from "./layout.ts";

export type PanelRole = "title" | "subtitle" | "date" | "body" | "label";

export type PanelFonts = {
	title: PDFFont;
	subtitle: PDFFont;
	date: PDFFont;
	body: PDFFont;
};

/** Uma linha ja medida, posicionada em relacao ao topo do painel. */
export type PanelRun = {
	role: PanelRole;
	text: string;
	size: number;
	/** Distancia do topo do painel ate a linha de base. */
	baseline: number;
	color: number;
};

export type PanelBox = {
	/** Distancia do topo do painel ate o topo da caixa de texto. */
	top: number;
	height: number;
};

export type PanelPageLayout = {
	runs: PanelRun[];
	box: PanelBox;
	/** Falso na pagina sem cabecalho: nada separa a caixa do topo. */
	header: boolean;
};

type Block = {
	role: PanelRole;
	size: number;
	lineHeight: number;
	color: number;
	gapAfter: number;
	lines: string[];
};

/**
 * Diagrama uma pagina do zine numa area fixa.
 *
 * Titulo, subtitulo e data so entram quando tem conteudo: um campo vazio nao
 * reserva altura e a caixa do texto comeca mais acima. O texto principal nunca
 * ultrapassa a caixa; o que nao couber vira pagina de continuacao identificada.
 */
export function layoutPanel(
	page: PageFields,
	fonts: PanelFonts,
	panelHeight: number = PANEL_HEIGHT,
	width: number = A4_CONTENT_WIDTH
): PanelPageLayout[] {
	const header = headerBlocks(page, fonts, width);
	const bodyLines = wrapText(page.body, fonts.body, POEM_BODY_SIZE, width);
	const pages: PanelPageLayout[] = [];
	let remaining = bodyLines;
	let blocks = header;

	do {
		const placed = placeHeader(blocks);
		const fit = fitBody(remaining, placed.cursor, panelHeight);

		pages.push({
			runs: [...placed.runs, ...fit.runs],
			box: { top: placed.cursor, height: panelHeight - placed.cursor },
			header: placed.runs.length > 0,
		});

		remaining = fit.overflow;
		blocks = continuationBlocks();
	} while (remaining.length > 0);

	return pages;
}

function headerBlocks(page: PageFields, fonts: PanelFonts, width: number): Block[] {
	const blocks: Block[] = [];

	if (page.title.trim()) {
		blocks.push({
			role: "title",
			size: POEM_TITLE_SIZE,
			lineHeight: POEM_TITLE_LINE_HEIGHT,
			color: 0,
			gapAfter: POEM_GAP_AFTER_TITLE,
			lines: wrapText(page.title, fonts.title, POEM_TITLE_SIZE, width),
		});
	}

	if (page.subtitle.trim()) {
		blocks.push({
			role: "subtitle",
			size: POEM_SUBTITLE_SIZE,
			lineHeight: POEM_SUBTITLE_LINE_HEIGHT,
			color: 0,
			gapAfter: POEM_GAP_AFTER_SUBTITLE,
			lines: wrapText(page.subtitle, fonts.subtitle, POEM_SUBTITLE_SIZE, width),
		});
	}

	if (page.date.trim()) {
		blocks.push({
			role: "date",
			size: POEM_DATE_SIZE,
			lineHeight: POEM_DATE_LINE_HEIGHT,
			color: POEM_DATE_COLOR,
			gapAfter: POEM_GAP_AFTER_DATE,
			lines: wrapText(page.date, fonts.date, POEM_DATE_SIZE, width),
		});
	}

	if (blocks.length > 0) {
		blocks[blocks.length - 1].gapAfter = POEM_GAP_AFTER_HEADER;
	}

	return blocks;
}

function continuationBlocks(): Block[] {
	return [
		{
			role: "label",
			size: POEM_SUBTITLE_SIZE,
			lineHeight: POEM_SUBTITLE_LINE_HEIGHT,
			color: POEM_DATE_COLOR,
			gapAfter: POEM_GAP_AFTER_HEADER,
			lines: [POEM_CONTINUATION_LABEL],
		},
	];
}

function placeHeader(blocks: Block[]): { runs: PanelRun[]; cursor: number } {
	const runs: PanelRun[] = [];
	let cursor = 0;

	for (const block of blocks) {
		for (const line of block.lines) {
			runs.push({
				role: block.role,
				text: line,
				size: block.size,
				baseline: cursor + block.size,
				color: block.color,
			});
			cursor += block.lineHeight;
		}

		cursor += block.gapAfter;
	}

	return { runs, cursor };
}

function fitBody(
	lines: string[],
	cursor: number,
	panelHeight: number
): { runs: PanelRun[]; overflow: string[] } {
	const runs: PanelRun[] = [];
	let y = cursor;

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		const advance = line === "" ? POEM_BLANK_LINE_HEIGHT : POEM_LINE_HEIGHT;

		if (y + advance > panelHeight) {
			// Area menor que uma linha: sem consumir ao menos uma
			// linha aqui, a pagina de continuacao repetiria a mesma
			// lista para sempre.
			if (runs.length === 0) {
				if (line !== "") {
					runs.push({
						role: "body",
						text: line,
						size: POEM_BODY_SIZE,
						baseline: y + POEM_BODY_SIZE,
						color: POEM_BODY_COLOR,
					});
				}

				return { runs, overflow: lines.slice(index + 1) };
			}

			return { runs, overflow: lines.slice(index) };
		}

		if (line !== "") {
			runs.push({
				role: "body",
				text: line,
				size: POEM_BODY_SIZE,
				baseline: y + POEM_BODY_SIZE,
				color: POEM_BODY_COLOR,
			});
		}

		y += advance;
	}

	return { runs, overflow: [] };
}
