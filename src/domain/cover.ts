import type { FontId } from "../lib/fonts.ts";
import { fontById, resolveFontId } from "../lib/fonts.ts";
import { isIsoDate } from "./date.ts";

export type Cover = {
	title: string;
	author: string;
	titleFont: FontId;
	authorFont: FontId;
	/** Data ISO (yyyy-mm-dd). Vazia significa capa sem data. */
	date: string;
};

export type CoverParams = {
	get: (key: string) => string | null;
};

export function coverFromParams(params: CoverParams): Cover {
	const date = params.get("date") ?? "";

	return {
		title: params.get("coverTitle") || "",
		author: params.get("authorName") || "",
		titleFont: resolveFontId(params.get("titleFont")),
		authorFont: resolveFontId(params.get("authorFont")),
		date: isIsoDate(date) ? date : "",
	};
}

export function titleClassOf(cover: Cover): string {
	return fontById(cover.titleFont).className;
}

export function authorClassOf(cover: Cover): string {
	return fontById(cover.authorFont).className;
}

export function formatDate(date: number): string {
	return new Date(date).toLocaleDateString("pt-BR");
}

export function isCoverComplete(cover: Cover): boolean {
	return Boolean(cover.title && cover.author);
}
