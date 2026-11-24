"use client";

import type { JSX } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import type { PageImage, ZineFormat } from "@/domain";
import { useImageUrl } from "@/hooks/useImageUrl";
import type { FontId } from "@/lib/fonts";
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
					image
				)
				: [],
		[fonts, painel, safetyMargin, title, subtitle, date, body, image]
	);

	if (!fonts) {
		return (
			<p className="text-sm text-zinc-500">Carregando pré-visualização...</p>
		);
	}

	return (
		<div className="space-y-4">
			{pages.map((page, index) => (
				<figure key={index} className="space-y-1">
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
					<figcaption className="text-center text-xs text-zinc-400">
						{index === 0 ? "Página 1" : `Continuação ${index}`}
					</figcaption>
				</figure>
			))}
		</div>
	);
}
