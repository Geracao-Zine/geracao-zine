import type { FormatOrientation, ZineFormat } from "../../domain/format.ts";
import {
        A4_LANDSCAPE,
        A4_PORTRAIT,
        ACCORDION_GUTTER,
        ACCORDION_MARGIN,
        BOOKLET_GUTTER,
        BOOKLET_MARGIN,
        GATEFOLD_GUTTER,
        GATEFOLD_MARGIN,
        MINIZINE16_GUTTER,
        MINIZINE16_MARGIN,
        MINIZINE_GUTTER,
        MINIZINE_MARGIN,
        PAGE_MARGIN,
        PANEL_GUTTER,
        TRIFOLD_GUTTER,
        TRIFOLD_MARGIN,
} from "./layout.ts";
import {
        ACCORDION_PLAN,
        FOLIO_PLAN,
        GATEFOLD_PLAN,
        MINIZINE16_PLAN,
        MINIZINE_PLAN,
        TRIFOLD_PLAN,
        ZFOLD_PLAN,
} from "./plans.ts";

/** Formatos com imposicao implementada. */
export type TemplateId =
        | "banner-a4"
        | "duas-colunas-vertical"
        | "duas-colunas-horizontal"
        | "quatro-retangulos"
        | "mini-zine"
        | "saddle-stitch"
        | "trifold"
        | "z-fold"
        | "accordion"
        | "gatefold"
        | "folio-unico"
        | "mini-zine-16";

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
        /** Permutacao fixa numa folha de N paginas, com parte dos slots girados. */
        | "minizine"
        /** Cadernos: cada folha carrega 4 paginas, dobradas e grampeadas. */
        | "booklet"
        /** Frente e verso com paginas fixas por slot, escritas como o leitor ve. */
        | "spread";

/**
 * Plano de uma folha unica que vira livrinho por corte e dobra.
 *
 * `pages` tem um item por slot e guarda a pagina (1-based) que cada posicao
 * recebe; 0 significa slot reservado a branco. `upsideDown` lista os slots
 * impressos girados 180 graus, que sao as fileiras que a dobra inverte.
 */
export type SheetPlan = {
        pageCount: number;
        pages: number[];
        upsideDown: number[];
};

/**
 * Plano de uma dobra de leitura: a frente e o verso recebem paginas fixas.
 *
 * O verso vai escrito como o leitor o encontra depois de virar a folha, do
 * mesmo jeito que nos cadernos: quem inverte o papel e a impressora.
 */
export type SpreadPlan = {
        front: number[];
        back: number[];
};

/**
 * Onde a folha dobra e onde ela e cortada, no meio das folgas.
 *
 * Cada indice aponta para a divisa entre duas colunas (0 e a divisa entre a
 * primeira e a segunda) ou entre duas fileiras. O gatefold nao dobra no centro;
 * o minizine corta no centro e dobra nas laterais.
 */
export type MarkPlan = {
        foldColumns: number[];
        cutColumns: number[];
        foldRows: number[];
        cutRows: number[];
};

const EMPTY_MARK_PLAN: MarkPlan = {
        foldColumns: [],
        cutColumns: [],
        foldRows: [],
        cutRows: [],
};

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
        /** Presente nas dobras de folha unica (minizine e livrinho de 16). */
        sheetPlan?: SheetPlan;
        /** Presente nas dobras de frente e verso com paginas fixas. */
        spreadPlan?: SpreadPlan;
        /** Dobras e cortes que recebem marca na impressao. */
        markPlan: MarkPlan;
};

type TemplateOptions = {
        margin?: number;
        gutter?: number;
        imposition?: ImpositionKind;
        sheetPlan?: SheetPlan;
        spreadPlan?: SpreadPlan;
        markPlan?: Partial<MarkPlan>;
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
                markPlan: { ...EMPTY_MARK_PLAN, ...options.markPlan },
                ...(options.sheetPlan ? { sheetPlan: options.sheetPlan } : {}),
                ...(options.spreadPlan ? { spreadPlan: options.spreadPlan } : {}),
        };
}

export const TEMPLATES: Record<TemplateId, ImpositionTemplate> = {
        "banner-a4": buildTemplate("banner-a4", A4_PORTRAIT, "portrait", 1, 1),
        "duas-colunas-vertical": buildTemplate(
                "duas-colunas-vertical",
                A4_PORTRAIT,
                "portrait",
                2,
                1,
                { markPlan: { foldColumns: [0] } }
        ),
        "duas-colunas-horizontal": buildTemplate(
                "duas-colunas-horizontal",
                A4_LANDSCAPE,
                "landscape",
                1,
                2,
                { markPlan: { foldRows: [0] } }
        ),
        "quatro-retangulos": buildTemplate(
                "quatro-retangulos",
                A4_PORTRAIT,
                "portrait",
                2,
                2,
                { markPlan: { foldColumns: [0], foldRows: [0] } }
        ),
        // Minizine: A4 deitada, 4 colunas por 2 fileiras, como manda a dobra
        // classica (3 dobras verticais e 1 horizontal). Assim cada painel fica
        // com a proporcao de uma pagina (~A7) e sai em pe. Margem e folga sao
        // menores porque o painel ainda passa por corte e dobra.
        "mini-zine": buildTemplate("mini-zine", A4_LANDSCAPE, "landscape", 4, 2, {
                margin: MINIZINE_MARGIN,
                gutter: MINIZINE_GUTTER,
                imposition: "minizine",
                sheetPlan: MINIZINE_PLAN,
                markPlan: { foldColumns: [0, 2], cutColumns: [1], foldRows: [0] },
        }),
        // Cadernos: folha deitada dobrada na lombada, dois paineis por face. A
        // margem da lombada e maior para o grampo nao encostar no texto.
        "saddle-stitch": buildTemplate("saddle-stitch", A4_LANDSCAPE, "landscape", 2, 1, {
                margin: BOOKLET_MARGIN,
                gutter: BOOKLET_GUTTER,
                imposition: "booklet",
                markPlan: { foldColumns: [0] },
        }),
        // Tríptico e dobra em Z: tres colunas numa folha deitada, uma dobra a
        // mais que as duas colunas simples.
        trifold: buildTemplate("trifold", A4_LANDSCAPE, "landscape", 3, 1, {
                margin: TRIFOLD_MARGIN,
                gutter: TRIFOLD_GUTTER,
                imposition: "spread",
                spreadPlan: TRIFOLD_PLAN,
                markPlan: { foldColumns: [0, 1] },
        }),
        "z-fold": buildTemplate("z-fold", A4_LANDSCAPE, "landscape", 3, 1, {
                margin: TRIFOLD_MARGIN,
                gutter: TRIFOLD_GUTTER,
                imposition: "spread",
                spreadPlan: ZFOLD_PLAN,
                markPlan: { foldColumns: [0, 1] },
        }),
        // Acordeao: quatro tiras. A folga menor compensa as tres dobras.
        accordion: buildTemplate("accordion", A4_LANDSCAPE, "landscape", 4, 1, {
                margin: ACCORDION_MARGIN,
                gutter: ACCORDION_GUTTER,
                imposition: "spread",
                spreadPlan: ACCORDION_PLAN,
                markPlan: { foldColumns: [0, 1, 2] },
        }),
        gatefold: buildTemplate("gatefold", A4_LANDSCAPE, "landscape", 4, 1, {
                margin: GATEFOLD_MARGIN,
                gutter: GATEFOLD_GUTTER,
                imposition: "spread",
                spreadPlan: GATEFOLD_PLAN,
                // As portas dobram nas laterais; o centro e o encontro delas.
                markPlan: { foldColumns: [0, 2] },
        }),
        // Folha unica: um painel por face, duas paginas. Reusa a grade do
        // banner, mas com imposicao de frente e verso.
        "folio-unico": buildTemplate("folio-unico", A4_PORTRAIT, "portrait", 1, 1, {
                imposition: "spread",
                spreadPlan: FOLIO_PLAN,
        }),
        // Livrinho de 16 paginas: 4x4 na folha retrato, dois cortes (um vertical
        // e um horizontal) produzem dois minizines de 8 paginas.
        "mini-zine-16": buildTemplate("mini-zine-16", A4_PORTRAIT, "portrait", 4, 4, {
                margin: MINIZINE16_MARGIN,
                gutter: MINIZINE16_GUTTER,
                imposition: "minizine",
                sheetPlan: MINIZINE16_PLAN,
                markPlan: {
                        foldColumns: [0, 2],
                        cutColumns: [1],
                        foldRows: [0, 2],
                        cutRows: [1],
                },
        }),
};

export const MINIZINE_PAGE_COUNT = MINIZINE_PLAN.pageCount;
export const MINIZINE16_PAGE_COUNT = MINIZINE16_PLAN.pageCount;

/** Pagina (1-based) que o slot recebe no plano de folha unica, ou 0 para branco. */
export function sheetPlanPage(template: ImpositionTemplate, slot: number): number {
        return template.sheetPlan?.pages[slot] ?? 0;
}

/** Verdadeiro quando o slot do plano de folha unica sai de cabeca para baixo. */
export function sheetPlanUpsideDown(template: ImpositionTemplate, slot: number): boolean {
        return template.sheetPlan?.upsideDown.includes(slot) ?? false;
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
