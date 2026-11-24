/**
 * Geometria de selecao do canvas livre.
 *
 * As medidas usam a mesma convencao do `PanelLayout`: origem no canto superior
 * esquerdo do painel, em pontos, com y crescendo para baixo. As funcoes aqui
 * sao puras para que arraste, redimensionamento e encaixe possam ser testados
 * sem DOM e repetidos no teclado.
 */

export type CanvasRect = {
        x: number;
        y: number;
        width: number;
        height: number;
};

export type CanvasBounds = {
        width: number;
        height: number;
};

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type GuideAxis = "vertical" | "horizontal";

export type CanvasGuide = {
        axis: GuideAxis;
        /** Coordenada da guia no eixo indicado. */
        position: number;
};

export type SnapOptions = {
        /** Margem de seguranca do painel; a area editavel comeca aqui. */
        inset?: number;
        /** Distancia em pontos para considerar que duas linhas encostaram. */
        threshold?: number;
};

export type SnapResult = {
        rect: CanvasRect;
        guides: CanvasGuide[];
};

export const DEFAULT_SNAP_THRESHOLD = 4;
export const MIN_ELEMENT_SIZE = 8;
export const DEFAULT_KEYBOARD_STEP = 1;
export const DEFAULT_KEYBOARD_LARGE_STEP = 10;

export const RESIZE_HANDLES: ResizeHandle[] = [
        "nw",
        "n",
        "ne",
        "e",
        "se",
        "s",
        "sw",
        "w",
];

type Targets = {
        x: number[];
        y: number[];
};

/** Linhas de encaixe do painel: margens e centro nos dois eixos. */
export function panelTargets(bounds: CanvasBounds, inset = 0): Targets {
        const left = clamp(inset, 0, bounds.width / 2);
        const top = clamp(inset, 0, bounds.height / 2);

        return {
                x: unique([left, bounds.width / 2, bounds.width - left]),
                y: unique([top, bounds.height / 2, bounds.height - top]),
        };
}

/**
 * Retangulo preso a area imprimivel.
 *
 * Quando o elemento e maior que a area, ele encolhe ate caber: um bloco maior
 * que o painel nao pode ser arrastado para fora nem esconder as alcas.
 */
export function clampRect(
        rect: CanvasRect,
        bounds: CanvasBounds,
        inset = 0
): CanvasRect {
        const maxWidth = Math.max(MIN_ELEMENT_SIZE, bounds.width - inset * 2);
        const maxHeight = Math.max(MIN_ELEMENT_SIZE, bounds.height - inset * 2);
        const width = clamp(rect.width, MIN_ELEMENT_SIZE, maxWidth);
        const height = clamp(rect.height, MIN_ELEMENT_SIZE, maxHeight);

        return {
                x: clamp(rect.x, inset, Math.max(inset, bounds.width - inset - width)),
                y: clamp(rect.y, inset, Math.max(inset, bounds.height - inset - height)),
                width,
                height,
        };
}

/** Move o retangulo e encaixa as bordas ou o centro nas linhas do painel. */
export function moveRect(
        rect: CanvasRect,
        dx: number,
        dy: number,
        bounds: CanvasBounds,
        options: SnapOptions = {}
): SnapResult {
        const moved = clampRect(
                { ...rect, x: rect.x + dx, y: rect.y + dy },
                bounds,
                options.inset ?? 0
        );

        return snapRect(moved, bounds, options);
}

/**
 * Redimensiona por uma alca, preservando a borda oposta.
 *
 * O tamanho minimo evita que o elemento vire uma linha impossivel de pegar de
 * novo. Depois do redimensionamento, so as bordas que se moveram sao encaixadas
 * nas guias.
 */
export function resizeRect(
        rect: CanvasRect,
        handle: ResizeHandle,
        dx: number,
        dy: number,
        bounds: CanvasBounds,
        options: SnapOptions = {}
): SnapResult {
        const inset = options.inset ?? 0;
        const minX = inset;
        const minY = inset;
        const maxX = Math.max(inset, bounds.width - inset);
        const maxY = Math.max(inset, bounds.height - inset);

        let left = rect.x;
        let top = rect.y;
        let right = rect.x + rect.width;
        let bottom = rect.y + rect.height;

        if (handle.includes("w")) {
                left = clamp(left + dx, minX, right - MIN_ELEMENT_SIZE);
        }

        if (handle.includes("e")) {
                right = clamp(right + dx, left + MIN_ELEMENT_SIZE, maxX);
        }

        if (handle.includes("n")) {
                top = clamp(top + dy, minY, bottom - MIN_ELEMENT_SIZE);
        }

        if (handle.includes("s")) {
                bottom = clamp(bottom + dy, top + MIN_ELEMENT_SIZE, maxY);
        }

        const resized: CanvasRect = {
                x: left,
                y: top,
                width: right - left,
                height: bottom - top,
        };

        return snapResize(resized, handle, bounds, options);
}

/** Passo de seta do teclado; Shift acelera sem mudar a semantica. */
export function keyboardStep(shiftKey = false): number {
        return shiftKey ? DEFAULT_KEYBOARD_LARGE_STEP : DEFAULT_KEYBOARD_STEP;
}

/** Teclas de seta devolvem o deslocamento; a decisao de mover ou redimensionar fica no componente. */
export function keyboardDelta(
        key: string,
        shiftKey = false
): { dx: number; dy: number } | null {
        const step = keyboardStep(shiftKey);

        if (key === "ArrowLeft") {
                return { dx: -step, dy: 0 };
        }

        if (key === "ArrowRight") {
                return { dx: step, dy: 0 };
        }

        if (key === "ArrowUp") {
                return { dx: 0, dy: -step };
        }

        if (key === "ArrowDown") {
                return { dx: 0, dy: step };
        }

        return null;
}

/** Guias visiveis quando o retangulo ja esta alinhado a uma linha do painel. */
export function alignmentGuides(
        rect: CanvasRect,
        bounds: CanvasBounds,
        options: SnapOptions = {}
): CanvasGuide[] {
        const threshold = options.threshold ?? DEFAULT_SNAP_THRESHOLD;
        const targets = panelTargets(bounds, options.inset ?? 0);
        const guides: CanvasGuide[] = [];

        for (const target of targets.x) {
                if (touches(rect.x, target, threshold)) {
                        guides.push({ axis: "vertical", position: target });
                        break;
                }

                if (touches(rect.x + rect.width / 2, target, threshold)) {
                        guides.push({ axis: "vertical", position: target });
                        break;
                }

                if (touches(rect.x + rect.width, target, threshold)) {
                        guides.push({ axis: "vertical", position: target });
                        break;
                }
        }

        for (const target of targets.y) {
                if (touches(rect.y, target, threshold)) {
                        guides.push({ axis: "horizontal", position: target });
                        break;
                }

                if (touches(rect.y + rect.height / 2, target, threshold)) {
                        guides.push({ axis: "horizontal", position: target });
                        break;
                }

                if (touches(rect.y + rect.height, target, threshold)) {
                        guides.push({ axis: "horizontal", position: target });
                        break;
                }
        }

        return guides;
}

function snapRect(
        rect: CanvasRect,
        bounds: CanvasBounds,
        options: SnapOptions
): SnapResult {
        const threshold = options.threshold ?? DEFAULT_SNAP_THRESHOLD;
        const targets = panelTargets(bounds, options.inset ?? 0);
        const x = nearest(
                [rect.x, rect.x + rect.width / 2, rect.x + rect.width],
                targets.x,
                threshold
        );
        const y = nearest(
                [rect.y, rect.y + rect.height / 2, rect.y + rect.height],
                targets.y,
                threshold
        );
        const snapped = clampRect(
                {
                        ...rect,
                        x: x === null ? rect.x : rect.x + x.delta,
                        y: y === null ? rect.y : rect.y + y.delta,
                },
                bounds,
                options.inset ?? 0
        );
        const guides: CanvasGuide[] = [];

        if (x !== null) {
                guides.push({ axis: "vertical", position: x.target });
        }

        if (y !== null) {
                guides.push({ axis: "horizontal", position: y.target });
        }

        return { rect: snapped, guides };
}

function snapResize(
        rect: CanvasRect,
        handle: ResizeHandle,
        bounds: CanvasBounds,
        options: SnapOptions
): SnapResult {
        const threshold = options.threshold ?? DEFAULT_SNAP_THRESHOLD;
        const targets = panelTargets(bounds, options.inset ?? 0);
        const guides: CanvasGuide[] = [];
        let next = { ...rect };

        if (handle.includes("w") || handle.includes("e")) {
                const edge = handle.includes("w") ? next.x : next.x + next.width;
                const snap = nearest([edge], targets.x, threshold);

                if (snap !== null) {
                        if (handle.includes("w")) {
                                next.width = Math.max(MIN_ELEMENT_SIZE, next.width - snap.delta);
                        } else {
                                next.width = Math.max(MIN_ELEMENT_SIZE, next.width + snap.delta);
                        }

                        next.x += handle.includes("w") ? snap.delta : 0;
                        guides.push({ axis: "vertical", position: snap.target });
                }
        }

        if (handle.includes("n") || handle.includes("s")) {
                const edge = handle.includes("n") ? next.y : next.y + next.height;
                const snap = nearest([edge], targets.y, threshold);

                if (snap !== null) {
                        if (handle.includes("n")) {
                                next.height = Math.max(MIN_ELEMENT_SIZE, next.height - snap.delta);
                        } else {
                                next.height = Math.max(MIN_ELEMENT_SIZE, next.height + snap.delta);
                        }

                        next.y += handle.includes("n") ? snap.delta : 0;
                        guides.push({ axis: "horizontal", position: snap.target });
                }
        }

        next = clampRect(next, bounds, options.inset ?? 0);

        return { rect: next, guides };
}

function nearest(
        edges: number[],
        targets: number[],
        threshold: number
): { delta: number; target: number } | null {
        let best: { delta: number; target: number } | null = null;

        for (const edge of edges) {
                for (const target of targets) {
                        const delta = target - edge;

                        if (
                                Math.abs(delta) <= threshold &&
                                (best === null || Math.abs(delta) < Math.abs(best.delta))
                        ) {
                                best = { delta, target };
                        }
                }
        }

        return best;
}

function touches(value: number, target: number, threshold: number): boolean {
        return Math.abs(value - target) <= threshold;
}

function unique(values: number[]): number[] {
        return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
}
