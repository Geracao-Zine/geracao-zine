import type { PageFields } from "../../domain/page.ts";
import type { PrintMode } from "../../domain/print.ts";
import { DEFAULT_PRINT_MODE } from "../../domain/print.ts";
import { layoutPanel } from "./panel.ts";
import type { PanelFonts, PanelPageLayout } from "./panel.ts";
import { panelSize } from "./templates.ts";
import type { ImpositionTemplate, PanelSlot, SheetSize } from "./templates.ts";

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
        /** Verdadeiro so no verso: os paineis foram espelhados para o duplex. */
        mirrored: boolean;
};

/**
 * Uma folha fisica: a frente e, no duplex, o verso.
 *
 * `back` e null quando a impressao e so frente ou quando as faces acabaram no
 * meio do par; nesse caso a impressora deixa o verso em branco.
 */
export type ImposedSheet = {
        /** Numero da folha fisica, a partir de 1. */
        number: number;
        front: ImposedFace;
        back: ImposedFace | null;
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
                        mirrored: false,
                });
        }

        return faces;
}

/**
 * Espelha um painel para o verso da folha.
 *
 * Vale a regra "virar na borda longa", que e o padrao dos drivers de impressao:
 * numa folha retrato a borda longa e a vertical, entao o verso troca esquerda
 * por direita; numa folha paisagem a borda longa e a horizontal, e o verso
 * troca topo por base.
 */
export function mirrorSlot(sheet: SheetSize, slot: PanelSlot): PanelSlot {
        if (sheet.width >= sheet.height) {
                return { ...slot, y: sheet.height - (slot.y + slot.height) };
        }

        return { ...slot, x: sheet.width - (slot.x + slot.width) };
}

/**
 * Monta o verso a partir da frente.
 *
 * Cada slot do verso e o espelho do slot correspondente na frente e leva junto
 * a pagina que ja estava nele. Espelhar a grade em torno do eixo da dobra
 * garante que a dobra caia no mesmo lugar fisico dos dois lados da folha, e
 * manter o par slot/pagina evita trocar paginas de lugar.
 *
 * Nos templates atuais a grade e centrada, entao o espelho devolve os mesmos
 * retangulos e o verso repete a frente. O calculo fica explicito porque um
 * template com dobra fora do centro depende dele para a dobra alinhar.
 */
export function mirrorFace(face: ImposedFace): ImposedFace {
        const sheet = { width: face.width, height: face.height };

        return {
                width: face.width,
                height: face.height,
                slots: face.slots.map((slot) => mirrorSlot(sheet, slot)),
                panels: [...face.panels],
                mirrored: true,
        };
}

/**
 * Agrupa as faces em folhas fisicas conforme o modo de impressao.
 *
 * No simplex cada face e uma folha. No duplex as faces andam em pares: a
 * primeira e a frente, a segunda vira o verso espelhado.
 */
export function imposeSheets(
        template: ImpositionTemplate,
        poems: PageFields[],
        fonts: PanelFonts,
        mode: PrintMode = DEFAULT_PRINT_MODE
): ImposedSheet[] {
        const faces = imposePoems(template, poems, fonts);

        if (mode === "simplex") {
                return faces.map((face, index) => ({
                        number: index + 1,
                        front: face,
                        back: null,
                }));
        }

        const sheets: ImposedSheet[] = [];

        for (let index = 0; index < faces.length; index += 2) {
                const front = faces[index];
                const verso = faces[index + 1];

                sheets.push({
                        number: sheets.length + 1,
                        front,
                        back: verso ? mirrorFace(verso) : null,
                });
        }

        return sheets;
}
