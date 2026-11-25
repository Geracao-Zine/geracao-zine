// Formas livres (linha, retangulo e arco). A espessura fica na mesma faixa do
// traco do divisor para a forma nao virar borrao nem sumir na impressao.
export const DEFAULT_SHAPE_WIDTH = 180;
export const DEFAULT_SHAPE_HEIGHT = 90;
export const DEFAULT_SHAPE_THICKNESS = 1;
export const DEFAULT_SHAPE_COLOR = 0.2;
export const MIN_SHAPE_THICKNESS = 0.25;
export const MAX_SHAPE_THICKNESS = 12;
export const SHAPE_DEFAULT_OFFSET = 20;
export const SHAPE_DEFAULT_GAP = 16;
// O arco e uma semicircunferencia inscrita na caixa. Mais segmentos deixam a
// curva lisa sem mudar a geometria entre preview e PDF.
export const SHAPE_ARC_SEGMENTS = 24;

export type ShapeKind = "line" | "rect" | "arc";

/** Forma posicionada no painel, com a mesma geometria do canvas e do PDF. */
export type ShapeBlock = {
        id: string;
        kind: ShapeKind;
        x: number;
        y: number;
        width: number;
        height: number;
        /** Espessura do traco em pontos. */
        thickness: number;
        /** Tom de 0 (preto) a 1 (branco), como o motor do PDF. */
        color: number;
        /** Ordem de empilhamento: valores maiores ficam na frente. */
        z: number;
        /** Impede arraste e redimensionamento no canvas. */
        locked: boolean;
};

export type ShapeBlockPatch = Partial<
        Pick<ShapeBlock, "x" | "y" | "width" | "height" | "thickness" | "color">
>;

export type ShapeArea = {
        width: number;
        height: number;
        inset?: number;
};

const SHAPE_LABEL: Record<ShapeKind, string> = {
        line: "Linha",
        rect: "Retângulo",
        arc: "Arco",
};

export function isShapeKind(value: unknown): value is ShapeKind {
        return value === "line" || value === "rect" || value === "arc";
}

export function shapeLabel(kind: ShapeKind): string {
        return SHAPE_LABEL[kind];
}

export function createShapeBlock(kind: ShapeKind, id: string): ShapeBlock {
        return {
                id,
                kind,
                x: 0,
                y: 0,
                width: DEFAULT_SHAPE_WIDTH,
                height: DEFAULT_SHAPE_HEIGHT,
                thickness: DEFAULT_SHAPE_THICKNESS,
                color: DEFAULT_SHAPE_COLOR,
                z: 0,
                locked: false,
        };
}

export function nextShapeBlockId(shapes: ShapeBlock[]): string {
        const ids = new Set(shapes.map((shape) => shape.id));
        let index = shapes.length + 1;

        while (ids.has(`shape-${index}`)) {
                index += 1;
        }

        return `shape-${index}`;
}

export function nextShapeBlockZ(shapes: ShapeBlock[]): number {
        return shapes.reduce((max, shape) => Math.max(max, shape.z), -1) + 1;
}

export function placeShapeBlock(
        shape: ShapeBlock,
        area: ShapeArea,
        index = 0
): ShapeBlock {
        const inset = area.inset ?? 0;
        const width = Math.min(
                shape.width,
                Math.max(1, area.width - (inset + SHAPE_DEFAULT_OFFSET) * 2)
        );
        const height = Math.min(
                shape.height,
                Math.max(1, area.height - (inset + SHAPE_DEFAULT_OFFSET) * 2)
        );
        const x = inset + SHAPE_DEFAULT_OFFSET;
        const maxY = Math.max(inset, area.height - inset - height);
        const y = Math.min(
                inset + SHAPE_DEFAULT_OFFSET + index * (height + SHAPE_DEFAULT_GAP),
                maxY
        );

        return { ...shape, x, y, width, height };
}

export function addShapeBlock(
        shapes: ShapeBlock[],
        kind: ShapeKind,
        area: ShapeArea,
        baseZ = 0
): ShapeBlock[] {
        const shape = placeShapeBlock(
                createShapeBlock(kind, nextShapeBlockId(shapes)),
                area,
                shapes.length
        );

        return [...shapes, { ...shape, z: Math.max(baseZ, nextShapeBlockZ(shapes)) }];
}

export function updateShapeBlock(
        shapes: ShapeBlock[],
        id: string,
        patch: ShapeBlockPatch
): ShapeBlock[] {
        return shapes.map((shape) => {
                if (shape.id !== id) {
                        return shape;
                }

                return {
                        ...shape,
                        ...patch,
                        width: Math.max(1, patch.width ?? shape.width),
                        height: Math.max(1, patch.height ?? shape.height),
                        thickness: clamp(
                                patch.thickness ?? shape.thickness,
                                MIN_SHAPE_THICKNESS,
                                MAX_SHAPE_THICKNESS
                        ),
                        color: clamp(patch.color ?? shape.color, 0, 1),
                };
        });
}

export function removeShapeBlock(shapes: ShapeBlock[], id: string): ShapeBlock[] {
        return shapes.filter((shape) => shape.id !== id);
}

function finite(value: unknown, fallback: number): number {
        return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
        return Math.min(max, Math.max(min, value));
}

export function shapeBlockFrom(
        source: Record<string, unknown>,
        fallbackId: string,
        fallbackZ = 0
): ShapeBlock {
        return {
                id: typeof source.id === "string" && source.id ? source.id : fallbackId,
                kind: isShapeKind(source.kind) ? source.kind : "line",
                x: finite(source.x, 0),
                y: finite(source.y, 0),
                width: Math.max(1, finite(source.width, DEFAULT_SHAPE_WIDTH)),
                height: Math.max(1, finite(source.height, DEFAULT_SHAPE_HEIGHT)),
                thickness: clamp(
                        finite(source.thickness, DEFAULT_SHAPE_THICKNESS),
                        MIN_SHAPE_THICKNESS,
                        MAX_SHAPE_THICKNESS
                ),
                color: clamp(finite(source.color, DEFAULT_SHAPE_COLOR), 0, 1),
                z: finite(source.z, fallbackZ),
                locked: source.locked === true,
        };
}

export function shapeBlocksFrom(value: unknown): ShapeBlock[] {
        if (!Array.isArray(value)) {
                return [];
        }

        const shapes: ShapeBlock[] = [];
        const ids = new Set<string>();

        value.forEach((entry, index) => {
                if (!entry || typeof entry !== "object") {
                        return;
                }

                const shape = shapeBlockFrom(
                        entry as Record<string, unknown>,
                        `shape-${index + 1}`,
                        index
                );

                if (ids.has(shape.id)) {
                        return;
                }

                ids.add(shape.id);
                shapes.push(shape);
        });

        return shapes;
}
