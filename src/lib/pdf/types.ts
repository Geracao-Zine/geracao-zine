import type { PageFields } from "../../domain/page.ts";
import type { FontId } from "../fonts";

/** Uma pagina do zine pronta para diagramar: os quatro campos do modelo. */
export type PdfPoem = PageFields;

export type ReadingPdfInput = {
	coverTitle: string;
	authorName: string;
	titleFont: FontId;
	authorFont: FontId;
	date: string;
	poems: PdfPoem[];
};

export { A4, A4_CONTENT_WIDTH } from "./layout.ts";
