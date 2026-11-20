import type { FormatOrientation, ZineFormat } from "../../domain/format.ts";
import { A4_LANDSCAPE, A4_PORTRAIT, PAGE_MARGIN, PANEL_GUTTER } from "./layout.ts";

/** Formatos com imposicao implementada. */
export type TemplateId =
        | "banner-a4"
        | "duas-colunas-vertical"
        | "duas-colunas-horizontal"
        | "quatro-retangulos";

export type SheetSize = {
        width: number;
        height: number;
};

/** Painel posicionado na folha, com origem no canto inferior esquerdo. */
export type PanelSlot = {
        x: number;
        y: number;
        width: number;
        height: number;
};

export type ImpositionTemplate = {
        id: TemplateId;
        orientation: FormatOrientation;
        sheet: SheetSize;
        columns: number;
        rows: number;
        /**
         * Paineis na ordem de leitura: esquerda para a direita e de cima para
         * baixo. O indice do array e a ordem em que as paginas entram.
         */
        slots: PanelSlot[];
};

function buildTemplate(
        id: TemplateId,
        sheet: SheetSize,
        orientation: FormatOrientation,
        columns: number,
        rows: number
): ImpositionTemplate {
        const usableWidth = sheet.width - PAGE_MARGIN * 2;
        const usableHeight = sheet.height - PAGE_MARGIN * 2;
        const panelWidth = (usableWidth - PANEL_GUTTER * (columns - 1)) / columns;
        const panelHeight = (usableHeight - PANEL_GUTTER * (rows - 1)) / rows;
        const slots: PanelSlot[] = [];

        for (let row = 0; row < rows; row += 1) {
                for (let column = 0; column < columns; column += 1) {
                        slots.push({
                                x: PAGE_MARGIN + column * (panelWidth + PANEL_GUTTER),
                                y:
                                        sheet.height -
                                        PAGE_MARGIN -
                                        panelHeight -
                                        row * (panelHeight + PANEL_GUTTER),
                                width: panelWidth,
                                height: panelHeight,
                        });
                }
        }

        return { id, orientation, sheet, columns, rows, slots };
}

export const TEMPLATES: Record<TemplateId, ImpositionTemplate> = {
        "banner-a4": buildTemplate("banner-a4", A4_PORTRAIT, "portrait", 1, 1),
        "duas-colunas-vertical": buildTemplate(
                "duas-colunas-vertical",
                A4_PORTRAIT,
                "portrait",
                2,
                1
        ),
        "duas-colunas-horizontal": buildTemplate(
                "duas-colunas-horizontal",
                A4_LANDSCAPE,
                "landscape",
                1,
                2
        ),
        "quatro-retangulos": buildTemplate(
                "quatro-retangulos",
                A4_PORTRAIT,
                "portrait",
                2,
                2
        ),
};

export function isTemplateId(format: ZineFormat): format is TemplateId {
        return Object.hasOwn(TEMPLATES, format);
}

/** Devolve o template do formato ou null quando ele ainda nao foi implementado. */
export function templateFor(format: ZineFormat): ImpositionTemplate | null {
        return isTemplateId(format) ? TEMPLATES[format] : null;
}

/** Medidas de um painel, iguais em todos os slots do template. */
export function panelSize(template: ImpositionTemplate): SheetSize {
        const [first] = template.slots;
        return { width: first.width, height: first.height };
}
