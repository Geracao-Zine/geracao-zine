import type { FontId } from "../fonts";

export type PdfPoem = {
	title: string;
	poetry: string;
};

export type ReadingPdfInput = {
	coverTitle: string;
	authorName: string;
	titleFont: FontId;
	authorFont: FontId;
	date: string;
	poems: PdfPoem[];
};

export const A4 = {
	width: 595,
	height: 842,
	margin: 70,
} as const;

export const A4_CONTENT_WIDTH = A4.width - A4.margin * 2;
