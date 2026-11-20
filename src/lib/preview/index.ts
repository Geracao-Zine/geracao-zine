import type { PageFields } from "../../domain/page.ts";
import type { FontId } from "../fonts.ts";
import { fontById } from "../fonts.ts";
import type { PanelFonts, PanelPageLayout } from "../pdf/panel.ts";
import { panelFontsFrom } from "../pdf/panel-fonts.ts";
import {
	A4_CONTENT_WIDTH,
	PANEL_HEIGHT,
	POEM_DIVIDER_COLOR,
	POEM_DIVIDER_THICKNESS,
} from "../pdf/layout.ts";
import { layoutPanel } from "../pdf/panel.ts";

export type { PanelFonts, PanelPageLayout };

// O preview desenha na mesma grade do PDF, em pontos tipograficos: o SVG so
// reescala o viewBox, entao nenhuma medida precisa ser recalculada na tela.
export const PREVIEW_WIDTH = A4_CONTENT_WIDTH;
export const PREVIEW_HEIGHT = PANEL_HEIGHT;
export const PREVIEW_DIVIDER_COLOR = gray(POEM_DIVIDER_COLOR);
export const PREVIEW_DIVIDER_THICKNESS = POEM_DIVIDER_THICKNESS;

const cache = new Map<FontId, Promise<PanelFonts>>();

/** Tom de cinza no mesmo espaco 0..1 usado pelas cores do PDF. */
export function gray(value: number): string {
	const channel = Math.round(value * 255);
	return `rgb(${channel} ${channel} ${channel})`;
}

async function fetchFont(path: string): Promise<ArrayBuffer> {
	const response = await fetch(path);
	if (!response.ok) {
		throw new Error(`falha ao carregar ${path}: ${response.status}`);
	}
	return response.arrayBuffer();
}

async function embedFonts(id: FontId): Promise<PanelFonts> {
	const { PDFDocument } = await import("pdf-lib");
	const fontkit = await import("@pdf-lib/fontkit").then((mod) => mod.default);

	const pdfDoc = await PDFDocument.create();
	pdfDoc.registerFontkit(fontkit);

	const face = fontById(id);
	const [regular, bold] = await Promise.all([
		fetchFont(face.regular),
		fetchFont(face.bold),
	]);

	return panelFontsFrom({
		regular: await pdfDoc.embedFont(regular, { subset: true }),
		bold: await pdfDoc.embedFont(bold, { subset: true }),
		italic: await pdfDoc.embedFont(regular, { subset: true }),
		embedded: true,
	});
}

/**
 * Carrega as fontes do preview com os mesmos TTF que o PDF embute.
 *
 * A medicao precisa ser a mesma dos dois lados: `widthOfTextAtSize` do pdf-lib
 * sobre o arquivo real, nao uma aproximacao da tela. Sem isso a bissecao
 * escolheria corpos diferentes para o mesmo texto e o preview mentiria.
 */
export function loadPanelFonts(id: FontId): Promise<PanelFonts> {
	const cached = cache.get(id);
	if (cached) {
		return cached;
	}

	const loading = embedFonts(id);
	cache.set(id, loading);
	return loading;
}

/** Diagrama uma poesia para a tela com o mesmo motor do PDF. */
export function layoutPreview(
	page: PageFields,
	fonts: PanelFonts
): PanelPageLayout[] {
	return layoutPanel(page, fonts);
}
