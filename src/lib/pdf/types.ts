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

export { A4, A4_CONTENT_WIDTH } from "./layout.ts";
