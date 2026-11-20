import type { PDFFont } from "pdf-lib";
import { wrapText } from "../wrap-text.ts";

/**
 * Corpo de fonte escolhido para o texto principal de um painel.
 *
 * `size` esta sempre na faixa [min, max]: a bissecao devolve o maior corpo
 * inteiro que faz o texto caber. Se nem o minimo couber, devolve o minimo com
 * `fits: false` e quem paginar decide a continuacao.
 */
export type BodyMetrics = {
	size: number;
	lineHeight: number;
	blankLineHeight: number;
	lines: string[];
	fits: boolean;
};

export type BodyFitRequest = {
	text: string;
	font: PDFFont;
	/** Largura util da caixa do texto. */
	width: number;
	/** Altura disponivel para o texto, ja descontado o cabecalho. */
	height: number;
	minSize: number;
	maxSize: number;
	/** Entrelinha dividida pelo corpo: proporcional ao corpo escolhido. */
	lineHeightRatio: number;
	/** Altura da linha vazia dividida pela entrelinha. */
	blankLineRatio: number;
};

export function lineHeightOf(size: number, ratio: number): number {
	return size * ratio;
}

export function heightOf(
	lines: string[],
	lineHeight: number,
	blankLineHeight: number
): number {
	return lines.reduce(
		(total, line) => total + (line === "" ? blankLineHeight : lineHeight),
		0
	);
}

/** Mede o texto num corpo fixo, sem bissecao. */
export function measureBody(
	request: Omit<BodyFitRequest, "minSize" | "maxSize">,
	size: number
): BodyMetrics {
	const lineHeight = lineHeightOf(size, request.lineHeightRatio);
	const blankLineHeight = lineHeight * request.blankLineRatio;
	const lines = wrapText(request.text, request.font, size, request.width);

	return {
		size,
		lineHeight,
		blankLineHeight,
		lines,
		fits: heightOf(lines, lineHeight, blankLineHeight) <= request.height,
	};
}

/**
 * Busca por bissecao o maior corpo inteiro entre `minSize` e `maxSize` que faz
 * o texto ocupar no maximo `height`.
 *
 * Corpo maior gera mais linhas e linhas mais altas, entao "cabe" e monotono na
 * faixa e a bissecao encontra o teto com poucas medicoes. Quando nenhum corpo
 * cabe, o retorno e a medicao no minimo, com `fits: false`.
 */
export function fitBody(request: BodyFitRequest): BodyMetrics {
	const { minSize: min, maxSize: max } = request;

	if (max < min) {
		throw new Error(`faixa de corpo invalida: ${min}..${max}`);
	}

	let low = min;
	let high = max;
	let best: BodyMetrics | null = null;

	while (low <= high) {
		const size = Math.floor((low + high) / 2);
		const candidate = measureBody(request, size);

		if (candidate.fits) {
			best = candidate;
			low = size + 1;
		} else {
			high = size - 1;
		}
	}

	return best ?? measureBody(request, min);
}
