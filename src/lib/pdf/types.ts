import type { ZineFormat } from "../../domain/format.ts";
import type { PageImage } from "../../domain/image.ts";
import type { PageFields } from "../../domain/page.ts";
import type { PrintMode } from "../../domain/print.ts";
import type { FontId } from "../fonts";

/** Uma pagina do zine pronta para diagramar: os quatro campos do modelo. */
export type PdfPoem = PageFields;

/**
 * Poema com a imagem opcional do painel.
 *
 * A imagem nao vai no PDF como dado do rascunho: ela e resolvida em memoria
 * na hora de gerar, entao quem chama `generateZinePdf` precisa passar os
 * bytes a parte, em `images`.
 */
export type PdfPoemWithImage = PdfPoem & { image?: PageImage | null };

export type ZinePdfInput = {
        coverTitle: string;
        authorName: string;
        titleFont: FontId;
        authorFont: FontId;
        date: string;
        /** Dobra escolhida: define orientacao, paineis por face e ordem de leitura. */
        format: ZineFormat;
        /** So frente ou frente e verso; no duplex o verso sai espelhado. */
        printMode: PrintMode;
        /** Marcas de corte e dobra nas bordas; ausente nao desenha. */
        marks?: boolean;
        /** Margem de seguranca dentro de cada painel, em milimetros. */
        safetyMarginMm?: number;
        poems: PdfPoemWithImage[];
        /**
         * Bytes das imagens por `assetId`. Sem a chave, a imagem e ignorada em
         * vez de quebrar a geracao: recarregar a pagina perde os bytes.
         */
        images?: ReadonlyMap<string, Uint8Array>;
};

export { A4, A4_CONTENT_WIDTH } from "./layout.ts";
