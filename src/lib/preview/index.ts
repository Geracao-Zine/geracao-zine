import type { PageImage } from "../../domain/image.ts";
import type { PageFields } from "../../domain/page.ts";
import type { ZineFormat } from "../../domain/format.ts";
import type { FontId } from "../fonts.ts";
import { fontById } from "../fonts.ts";
import type { PanelFonts, PanelPageLayout } from "../pdf/panel.ts";
import type { PanelLayout } from "../pdf/panel-elements.ts";
import { panelFontsFrom } from "../pdf/panel-fonts.ts";
import { panelSize, templateFor } from "../pdf/templates.ts";
import {
	A4_CONTENT_WIDTH,
	PANEL_HEIGHT,
	POEM_DIVIDER_COLOR,
	POEM_DIVIDER_THICKNESS,
} from "../pdf/layout.ts";
import { layoutPanelElements } from "../pdf/panel.ts";
import { panelDrawables } from "../pdf/panel-render.ts";

export type { PanelFonts, PanelLayout, PanelPageLayout };
export { orderedPanelElements } from "../pdf/panel-elements.ts";
export { panelDrawables };

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

/** Diagrama uma poesia para a tela com o mesmo motor e o mesmo tamanho de painel do PDF. */
export function layoutPreview(
	page: PageFields,
	fonts: PanelFonts,
	panel: PanelSize = { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT },
	inset = 0,
	image: PageImage | null = null
): PanelLayout[] {
	return layoutPanelElements(
		page,
		fonts,
		panel.height,
		panel.width,
		inset,
		image
	);
}

export type PanelSize = { width: number; height: number };

/**
 * Tamanho do painel do formato escolhido, ou o de uma pagina inteira quando a
 * dobra ainda nao tem imposicao. Sem isso o preview mediria numa caixa que o
 * PDF nao usa e prometeria um corpo de fonte que a impressao nao entrega.
 */
export function previewPanelFor(format: ZineFormat): PanelSize {
	const template = templateFor(format);
	return template ? panelSize(template) : { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT };
}
