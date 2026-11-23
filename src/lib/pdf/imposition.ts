import type { PageFields } from "../../domain/page.ts";
import type { PrintMode } from "../../domain/print.ts";
import { DEFAULT_PRINT_MODE } from "../../domain/print.ts";
import { layoutPanel } from "./panel.ts";
import type { PanelFonts, PanelPageLayout } from "./panel.ts";
import {
        panelSize,
        sheetPlanPage,
        sheetPlanUpsideDown,
} from "./templates.ts";
import type { ImpositionTemplate, PanelSlot, SheetSize } from "./templates.ts";

/**
 * Uma face impressa da folha.
 *
 * `panels` segue a mesma ordem de `slots`: a posicao i recebe a pagina que a
 * imposicao mandar para aquele slot. Fica null quando a pagina nao existe
 * (conteudo acabou) ou quando o slot e reservado a uma pagina em branco.
 */
export type ImposedFace = {
        width: number;
        height: number;
        slots: PanelSlot[];
        panels: (PanelPageLayout | null)[];
        /**
         * Rotacao de cada painel, em graus, no sentido da leitura do slot.
         * O minizine usa 180 na fileira de baixo; o resto sai em 0.
         */
        rotations: number[];
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
 * Distribui as paginas dos poemas nas faces do template, na ordem de leitura.
 *
 * Cada poema vira uma ou mais paginas de painel (continuacao quando o texto
 * nao cabe) e a sequencia inteira e cortada em blocos do tamanho da face. Um
 * poema longo, portanto, atravessa faces; um poema curto divide a folha com o
 * proximo.
 *
 * Vale so para as dobras de leitura simples; minizine e cadernos tem imposicao
 * propria em `imposeZine`.
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
                        rotations: template.slots.map(() => 0),
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
                rotations: [...face.rotations],
                mirrored: true,
        };
}

/** Modo de impressao que o template aceita: escolha do autor ou fixo. */
export function effectivePrintMode(template: ImpositionTemplate, mode: PrintMode): PrintMode {
        // Folha unica vira livrinho por corte: so tem um lado impresso.
        if (template.imposition === "minizine") {
                return "simplex";
        }

        // Cadernos, tríptico, sanfona e folha unica precisam dos dois lados.
        if (template.imposition === "booklet" || template.imposition === "spread") {
                return "duplex";
        }

        return mode;
}

/**
 * Impoe o zine inteiro: capa e poemas na ordem em que o leitor os encontra.
 *
 * Nas dobras de leitura simples a capa e uma folha inteira e fica de fora da
 * imposicao. No minizine, nos cadernos e nas dobras de frente e verso com
 * paginas fixas a capa e a pagina 1 do livrinho, entao ela entra na conta e e
 * diagramada dentro de um painel.
 */
export function imposeZine(options: {
        template: ImpositionTemplate;
        poems: PageFields[];
        fonts: PanelFonts;
        mode: PrintMode;
        /** Diagramacao da capa num painel; obrigatoria quando a capa entra na conta. */
        cover?: PanelPageLayout | null;
}): ImposedSheet[] {
        const { template, poems, fonts } = options;
        const mode = effectivePrintMode(template, options.mode);

        if (template.imposition === "sequence") {
                return pairFaces(imposePoems(template, poems, fonts), mode);
        }

        const { width, height } = panelSize(template);
        const poemPages = poems.flatMap((poem) => layoutPanel(poem, fonts, height, width));
        const pages: (PanelPageLayout | null)[] = [options.cover ?? null, ...poemPages];

        if (template.imposition === "minizine") {
                const count = template.sheetPlan?.pageCount ?? pages.length;
                return imposeSheetPlan(template, pad(pages, count));
        }

        if (template.imposition === "spread") {
                const slots = template.slots.length;
                return imposeSpreadPlan(template, pad(pages, slots * 2));
        }

        return imposeBooklet(template, pad(pages, bookletPageCount(pages.length)));
}

function pairFaces(faces: ImposedFace[], mode: PrintMode): ImposedSheet[] {
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

function emptyFace(template: ImpositionTemplate): ImposedFace {
        return {
                width: template.sheet.width,
                height: template.sheet.height,
                slots: template.slots,
                panels: template.slots.map(() => null),
                rotations: template.slots.map(() => 0),
                mirrored: false,
        };
}

/**
 * Folha unica que vira livrinho por corte e dobra: o minizine e o de 16 paginas.
 *
 * Nao ha verso porque todas as paginas saem no mesmo lado do papel; a ordem e a
 * rotacao de cada slot vem do plano declarado no template.
 */
function imposeSheetPlan(
        template: ImpositionTemplate,
        pages: (PanelPageLayout | null)[]
): ImposedSheet[] {
        const front = emptyFace(template);

        front.panels = template.slots.map((_, slot) => {
                const page = sheetPlanPage(template, slot);
                return page === 0 ? null : (pages[page - 1] ?? null);
        });
        front.rotations = template.slots.map((_, slot) =>
                sheetPlanUpsideDown(template, slot) ? 180 : 0
        );

        return [{ number: 1, front, back: null }];
}

/**
 * Frente e verso com paginas fixas por slot: tríptico, dobra em Z, acordeao,
 * gatefold e folha unica.
 *
 * O plano ja traz o verso na ordem em que o leitor o encontra depois de virar a
 * folha, entao nao passa pelo espelho: quem inverte o papel e a impressora. O
 * numero da pagina e 1-based e 0 significa painel em branco.
 */
function imposeSpreadPlan(
        template: ImpositionTemplate,
        pages: (PanelPageLayout | null)[]
): ImposedSheet[] {
        const plan = template.spreadPlan;
        const front = emptyFace(template);
        const back = emptyFace(template);

        const pick = (page: number): PanelPageLayout | null =>
                page === 0 ? null : (pages[page - 1] ?? null);

        front.panels = template.slots.map((_, slot) => pick(plan?.front[slot] ?? 0));
        back.panels = template.slots.map((_, slot) => pick(plan?.back[slot] ?? 0));

        return [{ number: 1, front, back }];
}

/**
 * Cadernos: cada folha leva 4 paginas, duas por face. A folha i recebe
 * (ultima, primeira) na frente e (segunda, penultima) no verso, de fora para
 * dentro; e assim que a lombada fecha na ordem certa depois do grampo.
 */
function imposeBooklet(
        template: ImpositionTemplate,
        pages: (PanelPageLayout | null)[]
): ImposedSheet[] {
        const total = pages.length;
        const sheets: ImposedSheet[] = [];

        for (let index = 0; index < total / 4; index += 1) {
                const front = emptyFace(template);
                const back = emptyFace(template);

                front.panels = [
                        pages[total - 1 - index * 2] ?? null,
                        pages[index * 2] ?? null,
                ];
                back.panels = [
                        pages[index * 2 + 1] ?? null,
                        pages[total - 2 - index * 2] ?? null,
                ];

                // Sem espelhar: o verso ja esta escrito como o leitor o ve, e
                // quem inverte a folha e a impressora (virando na borda curta).
                sheets.push({ number: index + 1, front, back });
        }

        return sheets;
}

/** Completa a lista com paginas em branco ate o tamanho exigido. */
function pad(
        pages: (PanelPageLayout | null)[],
        size: number
): (PanelPageLayout | null)[] {
        const padded = pages.slice(0, size);

        while (padded.length < size) {
                padded.push(null);
        }

        return padded;
}

/** Cadernos exigem multiplo de 4 paginas; o minimo e um caderno. */
function bookletPageCount(count: number): number {
        return Math.max(4, Math.ceil(count / 4) * 4);
}

/**
 * Agrupa as faces em folhas fisicas conforme o modo de impressao.
 *
 * Atalho para as dobras de leitura simples, sem capa. Minizine e cadernos
 * precisam de `imposeZine`, que conhece a posicao da capa.
 */
export function imposeSheets(
        template: ImpositionTemplate,
        poems: PageFields[],
        fonts: PanelFonts,
        mode: PrintMode = DEFAULT_PRINT_MODE
): ImposedSheet[] {
        if (template.imposition !== "sequence") {
                return imposeZine({ template, poems, fonts, mode });
        }

        return pairFaces(imposePoems(template, poems, fonts), mode);
}
