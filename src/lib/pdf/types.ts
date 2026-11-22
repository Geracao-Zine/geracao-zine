import type { ZineFormat } from "../../domain/format.ts";
import type { PageFields } from "../../domain/page.ts";
import type { FontId } from "../fonts";

/** Uma pagina do zine pronta para diagramar: os quatro campos do modelo. */
export type PdfPoem = PageFields;

export type ZinePdfInput = {
        coverTitle: string;
        authorName: string;
        titleFont: FontId;
        authorFont: FontId;
        date: string;
        /** Dobra escolhida: define orientacao, paineis por face e ordem de leitura. */
        format: ZineFormat;
        poems: PdfPoem[];
};

export { A4, A4_CONTENT_WIDTH } from "./layout.ts";
