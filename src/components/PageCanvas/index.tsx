"use client";

import type {
        JSX,
        KeyboardEvent as ReactKeyboardEvent,
        PointerEvent as ReactPointerEvent,
} from "react";
import { useId, useRef, useState } from "react";
import { DEFAULT_FONT_ID } from "@/lib/fonts";
import type { FontId } from "@/lib/fonts";
import type { PanelLayout } from "@/lib/preview";
import {
        DEFAULT_SNAP_THRESHOLD,
        RESIZE_HANDLES,
        alignmentGuides,
        keyboardDelta,
        moveRect,
        resizeRect,
} from "@/lib/canvas/selection";
import type {
        CanvasBounds,
        CanvasGuide,
        ResizeHandle,
} from "@/lib/canvas/selection";

type PanelElement = PanelLayout["elements"][number];
type PanelRect = PanelElement["rect"];

type Props = {
        layout: PanelLayout;
        selected: number | null;
        onSelect: (index: number | null) => void;
        onChange: (layout: PanelLayout) => void;
        /** Resolve a imagem do elemento; sem URL, o canvas mostra um marcador. */
        resolveImage?: (assetId: string) => string | null;
        className?: string;
};

type DragState = {
        mode: "move" | "resize";
        index: number;
        handle: ResizeHandle;
        start: { x: number; y: number };
        startRect: PanelRect;
};

const FAMILY: Record<FontId, string> = {
        geistSans: "Geist Zine Sans",
        geistMono: "Geist Zine Mono",
};

const HANDLE_SIZE = 8;
const HANDLE_OFFSET = HANDLE_SIZE / 2;
const SELECTION_COLOR = "#7c3aed";
const GUIDE_COLOR = "#ec4899";
const IMAGE_FALLBACK_FILL = "#e4e4e7";

const HANDLE_CURSOR: Record<ResizeHandle, string> = {
        nw: "nwse-resize",
        n: "ns-resize",
        ne: "nesw-resize",
        e: "ew-resize",
        se: "nwse-resize",
        s: "ns-resize",
        sw: "nesw-resize",
        w: "ew-resize",
};

/** Canvas do painel: seleciona por clique, arrasta e redimensiona pelas alcas. */
export default function PageCanvas({
        layout,
        selected,
        onSelect,
        onChange,
        resolveImage,
        className = "",
}: Props): JSX.Element {
        const svgRef = useRef<SVGSVGElement>(null);
        const drag = useRef<DragState | null>(null);
        const [guides, setGuides] = useState<CanvasGuide[]>([]);
        const recorteId = useId();
        const bounds: CanvasBounds = { width: layout.width, height: layout.height };
        const inset = layout.inset ?? 0;
        const ordered = layout.elements
                .map((element, index) => ({ element, index }))
                .sort((a, b) => a.element.z - b.element.z);

        const point = (event: ReactPointerEvent): { x: number; y: number } => {
                const svg = svgRef.current;
                const box = svg?.getBoundingClientRect();

                if (!box || box.width === 0 || box.height === 0) {
                        return { x: 0, y: 0 };
                }

                return {
                        x: ((event.clientX - box.left) * layout.width) / box.width,
                        y: ((event.clientY - box.top) * layout.height) / box.height,
                };
        };

        const selectAt = (index: number | null): void => {
                onSelect(index);

                if (index === null) {
                        setGuides([]);
                } else {
                        const element = layout.elements[index];
                        setGuides(
                                element
                                        ? alignmentGuides(element.rect, bounds, {
                                                inset,
                                                threshold: DEFAULT_SNAP_THRESHOLD,
                                        })
                                        : []
                        );
                }
        };

        const replaceRect = (index: number, rect: PanelRect): void => {
                const elements = layout.elements.map((element, current) =>
                        current === index ? { ...element, rect } : element
                );

                onChange({ ...layout, elements });
        };

        const start = (
                event: ReactPointerEvent,
                index: number,
                mode: "move" | "resize",
                handle: ResizeHandle = "se"
        ): void => {
                const element = layout.elements[index];

                if (!element) {
                        return;
                }

                event.preventDefault();
                event.stopPropagation();
                selectAt(index);
                drag.current = {
                        mode,
                        index,
                        handle,
                        start: point(event),
                        startRect: element.rect,
                };
                svgRef.current?.setPointerCapture(event.pointerId);
        };

        const move = (event: ReactPointerEvent): void => {
                const current = drag.current;

                if (!current) {
                        return;
                }

                event.preventDefault();
                const now = point(event);
                const dx = now.x - current.start.x;
                const dy = now.y - current.start.y;
                const result =
                        current.mode === "move"
                                ? moveRect(current.startRect, dx, dy, bounds, {
                                          inset,
                                          threshold: DEFAULT_SNAP_THRESHOLD,
                                  })
                                : resizeRect(
                                          current.startRect,
                                          current.handle,
                                          dx,
                                          dy,
                                          bounds,
                                          {
                                                  inset,
                                                  threshold: DEFAULT_SNAP_THRESHOLD,
                                          }
                                  );

                setGuides(result.guides);
                replaceRect(current.index, result.rect);
        };

        const end = (event: ReactPointerEvent): void => {
                if (!drag.current) {
                        return;
                }

                drag.current = null;
                setGuides([]);
                svgRef.current?.releasePointerCapture(event.pointerId);
        };

        const keyboard = (
                event: ReactKeyboardEvent<SVGElement>,
                index: number,
                mode: "move" | "resize",
                handle: ResizeHandle = "se"
        ): void => {
                const delta = keyboardDelta(event.key, event.shiftKey);

                if (!delta) {
                        return;
                }

                event.preventDefault();
                event.stopPropagation();
                const element = layout.elements[index];

                if (!element) {
                        return;
                }

                const result =
                        mode === "move"
                                ? moveRect(element.rect, delta.dx, delta.dy, bounds, {
                                          inset,
                                          threshold: DEFAULT_SNAP_THRESHOLD,
                                  })
                                : resizeRect(
                                          element.rect,
                                          handle,
                                          delta.dx,
                                          delta.dy,
                                          bounds,
                                          {
                                                  inset,
                                                  threshold: DEFAULT_SNAP_THRESHOLD,
                                          }
                                  );

                selectAt(index);
                setGuides(result.guides);
                replaceRect(index, result.rect);
        };

        return (
                <div className={`space-y-2 ${className}`}>
                        <svg
                                ref={svgRef}
                                viewBox={`0 0 ${layout.width} ${layout.height}`}
                                role="group"
                                aria-label="Canvas do painel"
                                className="w-full touch-none rounded-lg border border-zinc-300 bg-white select-none"
                                onPointerMove={move}
                                onPointerUp={end}
                                onPointerCancel={end}
                                onPointerDown={() => selectAt(null)}
                        >
                                <rect
                                        x={inset}
                                        y={inset}
                                        width={Math.max(0, layout.width - inset * 2)}
                                        height={Math.max(0, layout.height - inset * 2)}
                                        fill="none"
                                        stroke="#d4d4d8"
                                        strokeDasharray="4 4"
                                />

                                {guides.map((guide) => (
                                        <line
                                                key={`${guide.axis}-${guide.position}`}
                                                x1={guide.axis === "vertical" ? guide.position : 0}
                                                x2={guide.axis === "vertical" ? guide.position : layout.width}
                                                y1={guide.axis === "horizontal" ? guide.position : 0}
                                                y2={guide.axis === "horizontal" ? guide.position : layout.height}
                                                stroke={GUIDE_COLOR}
                                                strokeDasharray="3 3"
                                                strokeWidth={1}
                                                pointerEvents="none"
                                        />
                                ))}

                                {ordered.map(({ element, index }) => (
                                        <CanvasElement
                                                key={index}
                                                element={element}
                                                index={index}
                                                selected={selected === index}
                                                imageUrl={
                                                        element.type === "image" && resolveImage
                                                                ? resolveImage(element.content.assetId)
                                                                : null
                                                }
                                                recorteId={`${recorteId}-${index}`}
                                                onStart={start}
                                                onKeyboard={keyboard}
                                                onSelect={selectAt}
                                        />
                                ))}

                                {selected === null ? null : (
                                        <SelectionHandles
                                                rect={layout.elements[selected]?.rect}
                                                onStart={start}
                                                onKeyboard={keyboard}
                                                selected={selected}
                                        />
                                )}
                        </svg>
                        <p className="text-xs text-zinc-500">
                                Clique para selecionar. Arraste para mover. Foque uma alça e use as
                                setas para redimensionar; Shift acelera.
                        </p>
                </div>
        );
}

type ElementProps = {
        element: PanelElement;
        index: number;
        selected: boolean;
        imageUrl: string | null;
        recorteId: string;
        onStart: (
                event: ReactPointerEvent,
                index: number,
                mode: "move" | "resize",
                handle?: ResizeHandle
        ) => void;
        onKeyboard: (
                event: ReactKeyboardEvent<SVGElement>,
                index: number,
                mode: "move" | "resize",
                handle?: ResizeHandle
        ) => void;
        onSelect: (index: number | null) => void;
};

function CanvasElement({
        element,
        index,
        selected,
        imageUrl,
        recorteId,
        onStart,
        onKeyboard,
        onSelect,
}: ElementProps): JSX.Element {
        const common = {
                tabIndex: 0,
                role: "button",
                "aria-label": ariaLabel(element, index),
                onFocus: () => onSelect(index),
                onKeyDown: (event: ReactKeyboardEvent<SVGElement>) =>
                        onKeyboard(event, index, "move"),
                onPointerDown: (event: ReactPointerEvent) =>
                        onStart(event, index, "move"),
                style: { cursor: "move" },
        } as const;

        if (element.type === "image") {
                return (
                        <g {...common}>
                                {imageUrl ? (
                                        <>
                                                <defs>
                                                        <clipPath id={recorteId}>
                                                                <rect
                                                                        x={element.clip.x}
                                                                        y={element.clip.y}
                                                                        width={element.clip.width}
                                                                        height={element.clip.height}
                                                                />
                                                        </clipPath>
                                                </defs>
                                                <image
                                                        href={imageUrl}
                                                        x={element.rect.x}
                                                        y={element.rect.y}
                                                        width={element.rect.width}
                                                        height={element.rect.height}
                                                        preserveAspectRatio="none"
                                                        clipPath={`url(#${recorteId})`}
                                                />
                                        </>
                                ) : (
                                        <rect
                                                x={element.rect.x}
                                                y={element.rect.y}
                                                width={element.rect.width}
                                                height={element.rect.height}
                                                fill={IMAGE_FALLBACK_FILL}
                                                stroke="#a1a1aa"
                                                strokeDasharray="4 4"
                                        />
                                )}
                                <rect
                                        x={element.rect.x}
                                        y={element.rect.y}
                                        width={element.rect.width}
                                        height={element.rect.height}
                                        fill="transparent"
                                        stroke={selected ? SELECTION_COLOR : "transparent"}
                                        strokeWidth={1.5}
                                        pointerEvents="none"
                                />
                        </g>
                );
        }

        if (element.type === "rule") {
                const y = element.rect.y + element.rect.height / 2;

                return (
                        <g {...common}>
                                <line
                                        x1={element.rect.x}
                                        y1={y}
                                        x2={element.rect.x + element.rect.width}
                                        y2={y}
                                        stroke={gray(element.content.color)}
                                        strokeWidth={element.content.thickness}
                                />
                                <rect
                                        x={element.rect.x}
                                        y={element.rect.y}
                                        width={element.rect.width}
                                        height={element.rect.height}
                                        fill="transparent"
                                        stroke={selected ? SELECTION_COLOR : "transparent"}
                                        strokeWidth={1.5}
                                        pointerEvents="none"
                                />
                        </g>
                );
        }

        const family = FAMILY[element.content.font ?? DEFAULT_FONT_ID];

        return (
                <g {...common}>
                                {element.content.lines.map((line, lineIndex) => (
                                        <text
                                                key={lineIndex}
                                                x={line.x}
                                                y={line.baseline}
                                                fontFamily={family}
                                                fontWeight={element.content.role === "title" ? 700 : 400}
                                                fontSize={element.content.size}
                                                fill={gray(element.content.color)}
                                                xmlSpace="preserve"
                                                pointerEvents="none"
                                        >
                                                {line.text}
                                        </text>
                                ))}
                                <rect
                                        x={element.rect.x}
                                        y={element.rect.y}
                                        width={element.rect.width}
                                        height={element.rect.height}
                                        fill="transparent"
                                        stroke={selected ? SELECTION_COLOR : "transparent"}
                                        strokeWidth={1.5}
                                        pointerEvents="none"
                                />
                </g>
        );
}

type HandlesProps = {
        rect: PanelRect | undefined;
        selected: number;
        onStart: (
                event: ReactPointerEvent,
                index: number,
                mode: "move" | "resize",
                handle?: ResizeHandle
        ) => void;
        onKeyboard: (
                event: ReactKeyboardEvent<SVGElement>,
                index: number,
                mode: "move" | "resize",
                handle?: ResizeHandle
        ) => void;
};

function SelectionHandles({
        rect,
        selected,
        onStart,
        onKeyboard,
}: HandlesProps): JSX.Element | null {
        if (!rect) {
                return null;
        }

        return (
                <>
                        {RESIZE_HANDLES.map((handle) => {
                                const position = handlePosition(handle, rect);

                                return (
                                        <rect
                                                key={handle}
                                                x={position.x - HANDLE_OFFSET}
                                                y={position.y - HANDLE_OFFSET}
                                                width={HANDLE_SIZE}
                                                height={HANDLE_SIZE}
                                                fill="#ffffff"
                                                stroke={SELECTION_COLOR}
                                                strokeWidth={1.5}
                                                tabIndex={0}
                                                role="button"
                                                aria-label={`Redimensionar pelo ponto ${handle}`}
                                                style={{ cursor: HANDLE_CURSOR[handle] }}
                                                onPointerDown={(event) =>
                                                        onStart(event, selected, "resize", handle)
                                                }
                                                onKeyDown={(event) =>
                                                        onKeyboard(event, selected, "resize", handle)
                                                }
                                        />
                                );
                        })}
                </>
        );
}

function handlePosition(handle: ResizeHandle, rect: PanelRect): { x: number; y: number } {
        const x = handle.includes("w")
                ? rect.x
                : handle.includes("e")
                        ? rect.x + rect.width
                        : rect.x + rect.width / 2;
        const y = handle.includes("n")
                ? rect.y
                : handle.includes("s")
                        ? rect.y + rect.height
                        : rect.y + rect.height / 2;

        return { x, y };
}

function ariaLabel(element: PanelElement, index: number): string {
        const number = index + 1;

        if (element.type === "image") {
                return `Imagem ${number}: arraste para mover`;
        }

        if (element.type === "rule") {
                return `Divisória ${number}: arraste para mover`;
        }

        return `Texto ${number}: ${element.content.lines[0]?.text ?? "vazio"}`;
}

function gray(value: number): string {
        const channel = Math.round(value * 255);
        return `rgb(${channel} ${channel} ${channel})`;
}
