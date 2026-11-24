/**
 * Imagem colocada num painel do zine.
 *
 * A imagem existe apenas em memoria, para a impressao desta sessao: os bytes
 * ficam num `Map` do navegador (`src/lib/image-store.ts`) e nunca vao para o
 * rascunho nem para o servidor. Recarregar a pagina descarta a imagem, e por
 * isso a colocacao tambem nao e serializada.
 *
 * `scale` e um multiplicador unico sobre o tamanho que faz a imagem caber no
 * painel. Nao ha escala horizontal separada da vertical: e o que garante que a
 * imagem nunca apareca esticada.
 */
export type PageImage = {
        /** Chave dos bytes no store em memoria. */
        assetId: string;
        /** Tamanho em pixels do arquivo original. */
        naturalWidth: number;
        naturalHeight: number;
        /** Multiplicador uniforme sobre o encaixe que cabe no painel. */
        scale: number;
        /** Deslocamento como fracao do painel, para escolher o enquadramento. */
        offsetX: number;
        offsetY: number;
};

export const EMPTY_IMAGE_SCALE = 1;
export const EMPTY_IMAGE_OFFSET = 0;

function numero(value: unknown, fallback: number): number {
        return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function positivo(value: unknown, fallback: number): number {
        const numero = typeof value === "number" && Number.isFinite(value) ? value : fallback;
        return numero > 0 ? numero : fallback;
}

/**
 * Normaliza uma imagem vinda de fora (estado do editor, teste).
 *
 * Devolve null quando falta o `assetId` ou um tamanho natural valido: sem esses
 * dados nao ha como calcular o retangulo de desenho.
 */
export function pageImageFrom(source: unknown): PageImage | null {
        if (!source || typeof source !== "object") {
                return null;
        }

        const dados = source as Record<string, unknown>;
        const assetId = typeof dados.assetId === "string" ? dados.assetId.trim() : "";

        if (!assetId) {
                return null;
        }

        return {
                assetId,
                naturalWidth: positivo(dados.naturalWidth, 0),
                naturalHeight: positivo(dados.naturalHeight, 0),
                scale: positivo(dados.scale, EMPTY_IMAGE_SCALE),
                offsetX: numero(dados.offsetX, EMPTY_IMAGE_OFFSET),
                offsetY: numero(dados.offsetY, EMPTY_IMAGE_OFFSET),
        };
}

/** Verdadeiro quando o tamanho natural permite desenhar a imagem. */
export function hasDrawableSize(image: PageImage): boolean {
        return image.naturalWidth > 0 && image.naturalHeight > 0;
}
