import type { PDFFont } from "pdf-lib";
import type { TextBlock } from "../../domain/text-block.ts";
import { wrapText } from "../wrap-text.ts";
import { POEM_LINE_HEIGHT_RATIO } from "./layout.ts";
import type { PanelRect, PanelTextElement } from "./panel-elements.ts";

/**
 * Recorta o retangulo do bloco para dentro do painel.
 *
 * O modelo aceita qualquer posicao; a diagramacao garante que nada seja
 * desenhado fora da area imprimivel.
 */
export function textBlockRect(
        block: TextBlock,
        panelWidth: number,
        panelHeight: number
): PanelRect {
        const width = Math.min(Math.max(block.width, 1), Math.max(panelWidth, 1));
        const height = Math.min(Math.max(block.height, 1), Math.max(panelHeight, 1));

        return {
                x: Math.min(Math.max(block.x, 0), Math.max(panelWidth - width, 0)),
                y: Math.min(Math.max(block.y, 0), Math.max(panelHeight - height, 0)),
                width,
                height,
        };
}

function lineX(text: string, font: PDFFont, block: TextBlock, rect: PanelRect): number {
        const textWidth = font.widthOfTextAtSize(text, block.size);

        if (block.align === "center") {
                return rect.x + (rect.width - textWidth) / 2;
        }

        if (block.align === "right") {
                return rect.x + rect.width - textWidth;
        }

        return rect.x;
}

/**
 * Diagrama um bloco de texto no painel, quebrando as linhas com `wrapText`.
 *
 * A fonte e resolvida pelo chamador; o bloco guarda o `FontId` para que o
 * renderizador consiga repetir a mesma face no PDF e no preview.
 */
export function layoutTextBlock(
        block: TextBlock,
        font: PDFFont,
        panelWidth: number,
        panelHeight: number,
        z = 0
): PanelTextElement {
        const rect = textBlockRect(block, panelWidth, panelHeight);
        const lines = wrapText(block.text, font, block.size, rect.width);
        const lineHeight = block.size * POEM_LINE_HEIGHT_RATIO;

        return {
                type: "text",
                rect,
                content: {
                        role: block.kind === "title" ? "title" : "body",
                        size: block.size,
                        color: block.color,
                        align: block.align,
                        font: block.font,
                        lines: lines.map((text, index) => ({
                                text,
                                x: lineX(text, font, block, rect),
                                baseline: rect.y + block.size + index * lineHeight,
                        })),
                },
                z,
        };
}
