import type { FormatOrientation, ZineFormat } from "../../domain/format.ts";
import {
        A4_LANDSCAPE,
        A4_PORTRAIT,
        BOOKLET_GUTTER,
        BOOKLET_MARGIN,
        MINIZINE_GUTTER,
        MINIZINE_MARGIN,
        PAGE_MARGIN,
        PANEL_GUTTER,
} from "./layout.ts";

/** Formatos com imposicao implementada. */
export type TemplateId =
        | "banner-a4"
        | "duas-colunas-vertical"
        | "duas-colunas-horizontal"
        | "quatro-retangulos"
        | "mini-zine"
        | "saddle-stitch";

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

/** Como as paginas do zine entram nos slots do template. */
export type ImpositionKind =
        /** Ordem de leitura: a pagina i vai para o slot i. */
        | "sequence"
        /** Permutacao fixa por folha de 8 paginas, com metade dos slots girados. */
        | "minizine"
        /** Cadernos: cada folha carrega 4 paginas, dobradas e grampeadas. */
        | "booklet";

export type ImpositionTemplate = {
        id: TemplateId;
        orientation: FormatOrientation;
        sheet: SheetSize;
        columns: number;
        rows: number;
        /**
         * Paineis na ordem fisica: esquerda para a direita e de cima para
         * baixo. Nas dobras de leitura simples o indice tambem e a ordem em que
         * as paginas entram; nas demais a imposicao decide.
         */
        slots: PanelSlot[];
        imposition: ImpositionKind;
        /** Margem da folha ate o primeiro painel, e folga entre paineis. */
        margin: number;
        gutter: number;
};

/**
 * Minizine: uma folha A4 deitada, 4 colunas por 2 fileiras, vira um livrinho de
 * 8 paginas depois de um corte no meio e das dobras.
 *
 * A ordem e a da imposicao classica: os pares que se abrem juntos sao (8,1),
 * (2,3), (4,5) e (6,7). A fileira de baixo vai de cabeca para baixo porque a
 * folha gira meia volta ao ser dobrada; sem isso o leitor encontra a pagina de
 * cabeca para baixo no meio do livrinho.
 */
const MINIZINE_PAGES = [8, 1, 2, 3, 7, 6, 5, 4];
/** Indices da fileira de baixo: impressos girados 180 graus. */
const MINIZINE_UPSIDE_DOWN = [4, 5, 6, 7];

export const MINIZINE_PAGE_COUNT = MINIZINE_PAGES.length;

type TemplateOptions = {
        margin?: number;
        gutter?: number;
        imposition?: ImpositionKind;
};

function buildTemplate(
        id: TemplateId,
        sheet: SheetSize,
        orientation: FormatOrientation,
        columns: number,
        rows: number,
        options: TemplateOptions = {}
): ImpositionTemplate {
        const margin = options.margin ?? PAGE_MARGIN;
        const gutter = options.gutter ?? PANEL_GUTTER;
        const usableWidth = sheet.width - margin * 2;
        const usableHeight = sheet.height - margin * 2;
        const panelWidth = (usableWidth - gutter * (columns - 1)) / columns;
        const panelHeight = (usableHeight - gutter * (rows - 1)) / rows;
        const slots: PanelSlot[] = [];

        for (let row = 0; row < rows; row += 1) {
                for (let column = 0; column < columns; column += 1) {
                        slots.push({
                                x: margin + column * (panelWidth + gutter),
                                y: sheet.height - margin - panelHeight - row * (panelHeight + gutter),
                                width: panelWidth,
                                height: panelHeight,
                        });
                }
        }

        return {
                id,
                orientation,
                sheet,
                columns,
                rows,
                slots,
                imposition: options.imposition ?? "sequence",
                margin,
                gutter,
        };
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
        // Minizine: A4 deitada, 4 colunas por 2 fileiras, como manda a dobra
        // classica (3 dobras verticais e 1 horizontal). Assim cada painel fica
        // com a proporcao de uma pagina (~A7) e sai em pe. Margem e folga sao
        // menores porque o painel ainda passa por corte e dobra.
        "mini-zine": buildTemplate("mini-zine", A4_LANDSCAPE, "landscape", 4, 2, {
                margin: MINIZINE_MARGIN,
                gutter: MINIZINE_GUTTER,
                imposition: "minizine",
        }),
        // Cadernos: folha deitada dobrada na lombada, dois paineis por face. A
        // margem da lombada e maior para o grampo nao encostar no texto.
        "saddle-stitch": buildTemplate("saddle-stitch", A4_LANDSCAPE, "landscape", 2, 1, {
                margin: BOOKLET_MARGIN,
                gutter: BOOKLET_GUTTER,
                imposition: "booklet",
        }),
};

/** Pagina (1-based) que o slot recebe na folha do minizine. */
export function minizineSlotPage(slot: number): number | null {
        return MINIZINE_PAGES[slot] ?? null;
}

/** Verdadeiro quando o slot do minizine sai impresso de cabeca para baixo. */
export function minizineSlotUpsideDown(slot: number): boolean {
        return MINIZINE_UPSIDE_DOWN.includes(slot);
}

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
