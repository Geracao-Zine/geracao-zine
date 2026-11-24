"use client";

import type { JSX } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import type { PageImage, ZineFormat } from "@/domain";
import { useImageUrl } from "@/hooks/useImageUrl";
import type { FontId } from "@/lib/fonts";
import {
	PREVIEW_DIVIDER_COLOR,
	PREVIEW_DIVIDER_THICKNESS,
	gray,
	layoutPreview,
	loadPanelFonts,
	previewPanelFor,
} from "@/lib/preview";
import type { PanelFonts, PanelPageLayout } from "@/lib/preview";

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

	const pages = useMemo<PanelPageLayout[]>(
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
						{page.image && page.imageBox && imageUrl ? (
							<>
							<defs>
								{/* Mesma faixa que o PDF recorta: ampliar na tela mostra o
									mesmo enquadramento que sai na impressao. */}
								<clipPath id={`recorte-${recorteId}-${index}`}>
									<rect
										x={page.inset}
										y={page.inset}
										width={page.imageBox.width}
										height={page.imageBox.height}
									/>
								</clipPath>
							</defs>
							<image
								href={imageUrl}
								x={page.inset + page.image.x}
								y={page.inset + page.image.y}
								width={page.image.width}
								height={page.image.height}
								preserveAspectRatio="none"
								clipPath={`url(#recorte-${recorteId}-${index})`}
							/>
							</>
						) : null}

						{page.divider === null ? null : (
							<line
								x1={page.inset}
								x2={painel.width - page.inset}
								y1={page.inset + page.divider}
								y2={page.inset + page.divider}
								stroke={PREVIEW_DIVIDER_COLOR}
								strokeWidth={PREVIEW_DIVIDER_THICKNESS}
							/>
						)}

						{page.runs.map((run, runIndex) => (
							<text
								key={runIndex}
								x={page.inset}
								y={page.inset + run.baseline}
								fontFamily={FAMILY[font]}
								fontWeight={run.role === "title" ? 700 : 400}
								fontSize={run.size}
								fill={gray(run.color)}
								xmlSpace="preserve"
							>
								{run.text}
							</text>
						))}
					</svg>
					<figcaption className="text-center text-xs text-zinc-400">
						{index === 0 ? "Página 1" : `Continuação ${index}`}
					</figcaption>
				</figure>
			))}
		</div>
	);
}
