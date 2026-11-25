"use client";

import type { JSX } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import PageCanvas from "@/components/PageCanvas";
import type { PageImage, ShapeBlock, TextBlock, ZineFormat } from "@/domain";
import { useImageUrl } from "@/hooks/useImageUrl";
import type { FontId } from "@/lib/fonts";
import { shapePoints } from "@/lib/shape-geometry";
import {
	gray,
	layoutPreview,
	loadPanelFonts,
	panelDrawables,
	previewPanelFor,
} from "@/lib/preview";
import type { PanelFonts, PanelLayout } from "@/lib/preview";

type Props = {
	title: string;
	subtitle: string;
	date: string;
	body: string;
	/** Fonte do titulo do zine: o painel inteiro usa esta face. */
	font: FontId;
	/** Dobra escolhida: define o tamanho do painel medido no preview. */
	format: ZineFormat;
	/** Margem de seguranca do PDF, em pontos: o preview mede na mesma caixa. */
	safetyMargin: number;
	/** Imagem desta sessao; os bytes existem apenas no navegador. */
	image?: PageImage | null;
	/** Blocos posicionados; quando existem, substituem os campos algoritmicos. */
	blocks?: TextBlock[];
	/** Formas posicionadas por cima do layout da pagina. */
	shapes?: ShapeBlock[];
	/** Persiste a geometria dos blocos ajustada no canvas. */
	onBlocksChange?: (blocks: TextBlock[]) => void;
	/** Persiste a geometria das formas ajustada no canvas. */
	onShapesChange?: (shapes: ShapeBlock[]) => void;
	/** Habilita o canvas de selecao, arraste e redimensionamento. */
	editable?: boolean;
};

// As fontes vivem em globals.css apontando para os mesmos TTF que o PDF embute.
const FAMILY: Record<FontId, string> = {
	geistSans: "Geist Zine Sans",
	geistMono: "Geist Zine Mono",
};

async function loadFaces(family: string): Promise<void> {
	if (typeof document === "undefined" || !document.fonts) {
		return;
	}

	await Promise.all([
		document.fonts.load(`400 16px "${family}"`),
		document.fonts.load(`700 16px "${family}"`),
	]);
}

export default function PoemPreview({
	title,
	subtitle,
	date,
	body,
	font,
	format,
	safetyMargin,
	image = null,
	blocks,
	shapes,
	onBlocksChange,
	onShapesChange,
	editable = false,
}: Props): JSX.Element {
	// A fonte carregada vem junto com o id: quando o autor troca de fonte, o
	// id deixa de bater e o preview volta ao estado de carregamento sem
	// precisar zerar o estado dentro do efeito.
	const [loaded, setLoaded] = useState<{ id: FontId; fonts: PanelFonts } | null>(null);

	useEffect(() => {
		let active = true;

		// O layout mede com o TTF real; o SVG so desenha igual se a
		// mesma face ja estiver carregada, senao o navegador cai no
		// fallback e as larguras divergem do PDF.
		Promise.all([loadPanelFonts(font), loadFaces(FAMILY[font])]).then(
			([fonts]) => {
				if (active) {
					setLoaded({ id: font, fonts });
				}
			},
			() => undefined
		);

		return () => {
			active = false;
		};
	}, [font]);

	const fonts = loaded?.id === font ? loaded.fonts : null;
	const [editState, setEditState] = useState<{
		source: PanelLayout[];
		pages: PanelLayout[];
	} | null>(null);
	const [selected, setSelected] = useState<number | null>(null);
	const [editing, setEditing] = useState(false);

	const painel = useMemo(() => previewPanelFor(format), [format]);
	const imageUrl = useImageUrl(image?.assetId ?? null);
	const recorteId = useId();

	const pages = useMemo<PanelLayout[]>(
		() =>
			fonts
				? layoutPreview(
					{ title, subtitle, date, body },
					fonts,
					painel,
					safetyMargin,
					image,
					blocks,
					shapes
				)
				: [],
		[fonts, painel, safetyMargin, title, subtitle, date, body, image, blocks, shapes]
	);
	const shown = editState?.source === pages ? editState.pages : pages;

	if (!fonts) {
		return (
			<p className="text-sm text-zinc-500">Carregando pré-visualização...</p>
		);
	}

	const commitLayout = (index: number, next: PanelLayout): void => {
		setEditState((current) => {
			const base = current?.source === pages ? current.pages : pages;

			return {
				source: pages,
				pages: base.map((item, itemIndex) => (itemIndex === index ? next : item)),
			};
		});

		if (onBlocksChange && blocks && blocks.length > 0) {
			onBlocksChange(
				blocks.map((block) => {
					const element = next.elements.find(
						(item) => item.type === "text" && item.id === block.id
					);

					if (!element || element.type !== "text") {
						return block;
					}

					return {
						...block,
						x: element.rect.x,
						y: element.rect.y,
						width: element.rect.width,
						height: element.rect.height,
					};
				})
			);
		}

		if (onShapesChange && shapes && shapes.length > 0) {
			onShapesChange(
				shapes.map((shape) => {
					const element = next.elements.find(
						(item) => item.type === "shape" && item.id === shape.id
					);

					if (!element || element.type !== "shape") {
						return shape;
					}

					return {
						...shape,
						x: element.rect.x,
						y: element.rect.y,
						width: element.rect.width,
						height: element.rect.height,
					};
				})
			);
		}
	};

	return (
		<div className="space-y-4">
			{editable ? (
				<div className="flex justify-end">
					<button
						type="button"
						onClick={() => {
							setEditState({ source: pages, pages });
							setEditing((current) => !current);
						}}
						className="rounded-full border border-zinc-300 px-4 py-1 text-sm font-semibold hover:border-[var(--purple)] cursor-pointer dark:border-zinc-700"
					>
						{editing ? "Concluir ajustes" : "Ajustar posições"}
					</button>
				</div>
			) : null}

			{shown.map((page, index) => (
				<figure key={index} className="space-y-1">
					{editing ? (
						<PageCanvas
							layout={page}
							selected={selected}
							onSelect={setSelected}
							onChange={(next) => commitLayout(index, next)}
							resolveImage={() => imageUrl}
						/>
					) : (
						<svg
							viewBox={`0 0 ${painel.width} ${painel.height}`}
							role="img"
							aria-label={`Pré-visualização da página ${index + 1}`}
							className="w-full rounded-lg border border-zinc-300 bg-white"
						>
	                                                {panelDrawables(page).map((item, itemIndex) => {
	                                                        if (item.kind === "image") {
	                                                                if (!imageUrl) {
	                                                                        return null;
	                                                                }

	                                                                const recorte = `recorte-${recorteId}-${index}-${itemIndex}`;

	                                                                return (
	                                                                        <g key={`image-${itemIndex}`}>
	                                                                                <defs>
	                                                                                        {/* Mesma faixa que o PDF recorta: ampliar na tela mostra o
	                                                                                                mesmo enquadramento que sai na impressao. */}
	                                                                                        <clipPath id={recorte}>
	                                                                                                <rect
	                                                                                                        x={item.clipX}
	                                                                                                        y={item.clipY}
	                                                                                                        width={item.clipWidth}
	                                                                                                        height={item.clipHeight}
	                                                                                                />
	                                                                                        </clipPath>
	                                                                                </defs>
	                                                                                <image
	                                                                                        href={imageUrl}
	                                                                                        x={item.x}
	                                                                                        y={item.y}
	                                                                                        width={item.width}
	                                                                                        height={item.height}
	                                                                                        preserveAspectRatio="none"
	                                                                                        clipPath={`url(#${recorte})`}
	                                                                                />
	                                                                        </g>
	                                                                );
	                                                        }

	                                                        if (item.kind === "shape") {
	                                                                const points = shapePoints(item.shape, {
	                                                                        x: item.x,
	                                                                        y: item.y,
	                                                                        width: item.width,
	                                                                        height: item.height,
	                                                                });

	                                                                return (
	                                                                        <polyline
	                                                                                key={`shape-${itemIndex}`}
	                                                                                points={points.map((point) => `${point.x},${point.y}`).join(" ")}
	                                                                                fill="none"
	                                                                                stroke={gray(item.color)}
	                                                                                strokeWidth={item.thickness}
	                                                                        />
	                                                                );
	                                                        }

	                                                        if (item.kind === "rule") {
	                                                                return (
	                                                                        <line
	                                                                                key={`rule-${itemIndex}`}
	                                                                                x1={item.x1}
	                                                                                x2={item.x2}
	                                                                                y1={item.y1}
	                                                                                y2={item.y2}
	                                                                                stroke={gray(item.color)}
	                                                                                strokeWidth={item.thickness}
	                                                                        />
	                                                                );
	                                                        }

	                                                        return (
	                                                                <text
	                                                                        key={`text-${itemIndex}`}
	                                                                        x={item.x}
	                                                                        y={item.y}
	                                                                        fontFamily={FAMILY[item.font ?? font]}
	                                                                        fontWeight={item.role === "title" ? 700 : 400}
	                                                                        fontSize={item.size}
	                                                                        fill={gray(item.color)}
	                                                                        xmlSpace="preserve"
	                                                                >
	                                                                        {item.text}
	                                                                </text>
	                                                        );
	                                                })}
	                                        </svg>
					)}
					<figcaption className="text-center text-xs text-zinc-400">
						{index === 0 ? "Página 1" : `Continuação ${index}`}
					</figcaption>
				</figure>
			))}
		</div>
	);
}
