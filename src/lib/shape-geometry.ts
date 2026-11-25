import type { ShapeBlock } from "../domain/shape-block.ts";
import { SHAPE_ARC_SEGMENTS } from "../domain/shape-block.ts";

export type ShapeRect = { x: number; y: number; width: number; height: number };
export type ShapePoint = { x: number; y: number };

/** Recorta a forma para dentro do painel, como o bloco de texto. */
export function shapeBlockRect(
        shape: ShapeBlock,
        panelWidth: number,
        panelHeight: number
): ShapeRect {
        const width = Math.min(Math.max(shape.width, 1), Math.max(panelWidth, 1));
        const height = Math.min(Math.max(shape.height, 1), Math.max(panelHeight, 1));

        return {
                x: Math.min(Math.max(shape.x, 0), Math.max(panelWidth - width, 0)),
                y: Math.min(Math.max(shape.y, 0), Math.max(panelHeight - height, 0)),
                width,
                height,
        };
}

/**
 * Semicircunferencia superior inscrita na caixa, de oeste para leste.
 *
 * Preview e PDF desenham exatamente estes pontos; o numero de segmentos e
 * constante para a curva nao mudar entre os dois alvos.
 */
export function arcPoints(
        rect: ShapeRect,
        segments = SHAPE_ARC_SEGMENTS
): ShapePoint[] {
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const rx = rect.width / 2;
        const ry = rect.height / 2;
        const total = Math.max(2, Math.round(segments));

        return Array.from({ length: total + 1 }, (_, index) => {
                const angle = Math.PI + (Math.PI * index) / total;

                return {
                        x: cx + rx * Math.cos(angle),
                        y: cy + ry * Math.sin(angle),
                };
        });
}

/** Pontos do traco na ordem em que preview e PDF desenham. */
export function shapePoints(kind: ShapeBlock["kind"], rect: ShapeRect): ShapePoint[] {
        if (kind === "line") {
                return [
                        { x: rect.x, y: rect.y },
                        { x: rect.x + rect.width, y: rect.y + rect.height },
                ];
        }

        if (kind === "rect") {
                return [
                        { x: rect.x, y: rect.y },
                        { x: rect.x + rect.width, y: rect.y },
                        { x: rect.x + rect.width, y: rect.y + rect.height },
                        { x: rect.x, y: rect.y + rect.height },
                        { x: rect.x, y: rect.y },
                ];
        }

        return arcPoints(rect);
}
