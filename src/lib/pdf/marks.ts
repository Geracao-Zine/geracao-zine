import type { ImpositionTemplate } from "./templates.ts";

export type MarkKind = "fold" | "cut";

/** Linha de dobra ou corte na folha, em pontos a partir da borda esquerda/inferior. */
export type MarkLine = {
        axis: "vertical" | "horizontal";
        at: number;
        kind: MarkKind;
};

function columnBoundary(template: ImpositionTemplate, index: number): number {
        const slot = template.slots[index];
        return slot.x + slot.width + template.gutter / 2;
}

function rowBoundary(template: ImpositionTemplate, index: number): number {
        const slot = template.slots[index * template.columns];
        return slot.y - template.gutter / 2;
}

/**
 * Converte o plano de divisas em coordenadas da folha.
 *
 * A dobra fica no meio da folga: o painel da esquerda termina em `x` e o da
 * direita comeca em `x + gutter`, entao a linha e `x + gutter / 2`. As fileiras
 * seguem a mesma conta, medidas a partir da base.
 */
export function markLines(template: ImpositionTemplate): MarkLine[] {
        const { markPlan } = template;
        const lines: MarkLine[] = [];

        for (const index of markPlan.foldColumns) {
                lines.push({
                        axis: "vertical",
                        at: columnBoundary(template, index),
                        kind: "fold",
                });
        }

        for (const index of markPlan.cutColumns) {
                lines.push({
                        axis: "vertical",
                        at: columnBoundary(template, index),
                        kind: "cut",
                });
        }

        for (const index of markPlan.foldRows) {
                lines.push({
                        axis: "horizontal",
                        at: rowBoundary(template, index),
                        kind: "fold",
                });
        }

        for (const index of markPlan.cutRows) {
                lines.push({
                        axis: "horizontal",
                        at: rowBoundary(template, index),
                        kind: "cut",
                });
        }

        return lines;
}
