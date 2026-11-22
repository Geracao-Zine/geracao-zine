import type { PageFields } from "../../domain/page.ts";
import { layoutPanel } from "./panel.ts";
import type { PanelFonts, PanelPageLayout } from "./panel.ts";
import { panelSize } from "./templates.ts";
import type { ImpositionTemplate, PanelSlot } from "./templates.ts";

/**
 * Uma face impressa da folha.
 *
 * `panels` segue a mesma ordem de `slots`: a posicao i recebe a i-esima pagina
 * do zine na ordem de leitura. Sobra vazia quando o conteudo termina no meio da
 * face, para nao inventar pagina em branco numerada.
 */
export type ImposedFace = {
        width: number;
        height: number;
        slots: PanelSlot[];
        panels: (PanelPageLayout | null)[];
};

/**
 * Distribui as paginas dos poemas nas faces do template.
 *
 * Cada poema vira uma ou mais paginas de painel (continuacao quando o texto
 * nao cabe) e a sequencia inteira e cortada em blocos do tamanho da face. Um
 * poema longo, portanto, atravessa faces; um poema curto divide a folha com o
 * proximo.
 */
export function imposePoems(
        template: ImpositionTemplate,
        poems: PageFields[],
        fonts: PanelFonts
): ImposedFace[] {
        const { width, height } = panelSize(template);
        const pages = poems.flatMap((poem) => layoutPanel(poem, fonts, height, width));
        const faces: ImposedFace[] = [];

        for (let start = 0; start < pages.length; start += template.slots.length) {
                const slice = pages.slice(start, start + template.slots.length);

                faces.push({
                        width: template.sheet.width,
                        height: template.sheet.height,
                        slots: template.slots,
                        panels: template.slots.map((_, index) => slice[index] ?? null),
                });
        }

        return faces;
}
