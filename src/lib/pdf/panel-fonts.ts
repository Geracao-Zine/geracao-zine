import type { EmbedResult } from "./fonts.ts";
import type { PanelFonts } from "./panel.ts";

/**
 * Mapeia as fontes embutidas para os papeis do painel.
 *
 * O corpo usa a regular como italico porque o TTF do registro nao tem corte
 * italico: o PDF e o preview precisam medir a mesma face, senao a quebra de
 * linha difere entre os dois.
 */
export function panelFontsFrom(embedded: EmbedResult): PanelFonts {
	return {
		title: embedded.bold,
		subtitle: embedded.regular,
		date: embedded.regular,
		body: embedded.italic,
	};
}
