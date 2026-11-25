import type { FontId } from "../lib/fonts.ts";
import { DEFAULT_FONT_ID, resolveFontId } from "../lib/fonts.ts";
import type { TextAlign } from "../lib/pdf/panel-elements.ts";

export type { TextAlign } from "../lib/pdf/panel-elements.ts";

export type TextBlockKind = "title" | "text";

/**
 * Bloco de texto posicionado dentro do painel.
 *
 * As coordenadas usam a mesma convencao do preview e do `PanelLayout`: origem
 * no canto superior esquerdo, em pontos, com y crescendo para baixo. O bloco
 * aceita qualquer posicao; o layout recorta o retangulo para dentro do painel.
 */
export type TextBlock = {
        id: string;
        kind: TextBlockKind;
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        font: FontId;
        size: number;
        /** Tom de 0 (preto) a 1 (branco), como o motor do PDF. */
        color: number;
        align: TextAlign;
};

export const DEFAULT_TEXT_BLOCK_WIDTH = 200;
export const DEFAULT_TEXT_BLOCK_HEIGHT = 80;
export const DEFAULT_TEXT_BLOCK_SIZE = 12;
export const MIN_TEXT_BLOCK_SIZE = 4;
export const MAX_TEXT_BLOCK_SIZE = 96;
export const DEFAULT_TEXT_BLOCK_COLOR = 0;
/** Distancia entre a borda segura e o primeiro bloco empilhado. */
export const DEFAULT_TEXT_BLOCK_OFFSET = 24;
/** Espaco vertical entre blocos criados na mesma pagina. */
export const DEFAULT_TEXT_BLOCK_GAP = 16;

export type TextBlockPatch = Partial<
        Pick<
                TextBlock,
                "text" | "x" | "y" | "width" | "height" | "font" | "size" | "color" | "align"
        >
>;

export type TextBlockArea = {
        width: number;
        height: number;
        /** Margem de seguranca ja convertida para pontos. */
        inset?: number;
};

const ALIGNS: TextAlign[] = ["left", "center", "right"];

export function isTextAlign(value: unknown): value is TextAlign {
        return ALIGNS.includes(value as TextAlign);
}

export function isTextBlockKind(value: unknown): value is TextBlockKind {
        return value === "title" || value === "text";
}

function text(value: unknown): string {
        return typeof value === "string" ? value : "";
}

function finite(value: unknown, fallback: number): number {
        return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function positive(value: unknown, fallback: number): number {
        const number = finite(value, fallback);
        return number > 0 ? number : fallback;
}

function clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
}

export function createTextBlock(kind: TextBlockKind, id: string): TextBlock {
        return {
                id,
                kind,
                text: "",
                x: 0,
                y: 0,
                width: DEFAULT_TEXT_BLOCK_WIDTH,
                height: DEFAULT_TEXT_BLOCK_HEIGHT,
                font: DEFAULT_FONT_ID,
                size: DEFAULT_TEXT_BLOCK_SIZE,
                color: DEFAULT_TEXT_BLOCK_COLOR,
                align: "left",
        };
}

export function nextTextBlockId(blocks: TextBlock[]): string {
        const ids = new Set(blocks.map((block) => block.id));
        let index = blocks.length + 1;

        while (ids.has(`block-${index}`)) {
                index += 1;
        }

        return `block-${index}`;
}

/** Coloca um bloco novo em pilha dentro da area segura, sem sair do painel. */
export function placeTextBlock(
        block: TextBlock,
        index: number,
        area: TextBlockArea
): TextBlock {
        const inset = area.inset ?? 0;
        const x = inset + DEFAULT_TEXT_BLOCK_OFFSET;
        const width = Math.max(1, area.width - x - inset);
        const height = Math.min(
                DEFAULT_TEXT_BLOCK_HEIGHT,
                Math.max(1, area.height - inset * 2)
        );
        const maxY = Math.max(inset, area.height - inset - height);
        const y = Math.min(
                inset + DEFAULT_TEXT_BLOCK_OFFSET +
                        index * (DEFAULT_TEXT_BLOCK_HEIGHT + DEFAULT_TEXT_BLOCK_GAP),
                maxY
        );

        return { ...block, x, y, width, height };
}

export function addTextBlock(
        blocks: TextBlock[],
        kind: TextBlockKind,
        area: TextBlockArea
): TextBlock[] {
        const block = placeTextBlock(
                createTextBlock(kind, nextTextBlockId(blocks)),
                blocks.length,
                area
        );

        return [...blocks, block];
}

export function updateTextBlock(
        blocks: TextBlock[],
        id: string,
        patch: TextBlockPatch
): TextBlock[] {
        return blocks.map((block) => (block.id === id ? { ...block, ...patch } : block));
}

export function removeTextBlock(blocks: TextBlock[], id: string): TextBlock[] {
        return blocks.filter((block) => block.id !== id);
}

export function textBlockHasText(block: TextBlock): boolean {
        return block.text.trim().length > 0;
}

/**
 * Reconstroi um bloco vindo de rascunho salvo.
 *
 * Cada campo e validado isoladamente; um valor invalido cai no padrao sem
 * descartar o bloco inteiro. Posicoes negativas ou fora do painel sao
 * preservadas aqui e recortadas na hora de diagramar.
 */
export function textBlockFrom(
        source: Record<string, unknown>,
        fallbackId: string
): TextBlock {
        return {
                id: text(source.id) || fallbackId,
                kind: isTextBlockKind(source.kind) ? source.kind : "text",
                text: text(source.text),
                x: finite(source.x, 0),
                y: finite(source.y, 0),
                width: positive(source.width, DEFAULT_TEXT_BLOCK_WIDTH),
                height: positive(source.height, DEFAULT_TEXT_BLOCK_HEIGHT),
                font: resolveFontId(text(source.font)),
                size: clamp(
                        finite(source.size, DEFAULT_TEXT_BLOCK_SIZE),
                        MIN_TEXT_BLOCK_SIZE,
                        MAX_TEXT_BLOCK_SIZE
                ),
                color: clamp(finite(source.color, DEFAULT_TEXT_BLOCK_COLOR), 0, 1),
                align: isTextAlign(source.align) ? source.align : "left",
        };
}

export function textBlocksFrom(value: unknown): TextBlock[] {
        if (!Array.isArray(value)) {
                return [];
        }

        const blocks: TextBlock[] = [];
        const ids = new Set<string>();

        value.forEach((entry, index) => {
                if (!entry || typeof entry !== "object") {
                        return;
                }

                const block = textBlockFrom(
                        entry as Record<string, unknown>,
                        `block-${index + 1}`
                );

                if (ids.has(block.id)) {
                        return;
                }

                ids.add(block.id);
                blocks.push(block);
        });

        return blocks;
}
