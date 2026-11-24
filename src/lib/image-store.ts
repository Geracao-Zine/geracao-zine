/**
 * Bytes das imagens desta sessao, em memoria.
 *
 * Decisao do projeto: a imagem serve para imprimir agora e nao e salva. Nao ha
 * upload, nao ha disco e nao ha coluna no banco. Recarregar a pagina descarta
 * os bytes, e o rascunho guarda no maximo o `assetId` — que deixa de resolver e
 * simplesmente nao desenha.
 *
 * Um `Map` de modulo basta porque so o navegador le daqui, e o PDF e gerado no
 * cliente a partir desses mesmos bytes.
 */
export type ImageBytes = {
        bytes: Uint8Array;
        /** `image/png` ou `image/jpeg`: os dois formatos que o pdf-lib embute. */
        mime: string;
};

const store = new Map<string, ImageBytes>();
let sequencia = 0;

/** Formatos aceitos pelo `pdf-lib` sem conversao. */
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg"] as const;

export function isAcceptedImageType(mime: string): boolean {
        return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mime);
}

/** Guarda os bytes e devolve a chave que a pagina usa para referencia-los. */
export function putImage(bytes: Uint8Array, mime: string): string {
        sequencia += 1;
        const assetId = `img-${sequencia}`;
        store.set(assetId, { bytes, mime });

        return assetId;
}

/** Bytes da imagem, ou null quando a sessao ja nao os tem (apos recarregar). */
export function getImage(assetId: string): ImageBytes | null {
        return store.get(assetId) ?? null;
}

export function hasImage(assetId: string): boolean {
        return store.has(assetId);
}

/**
 * Bytes das imagens referenciadas, indexados por `assetId`.
 *
 * A montagem ignora o que a sessao ja perdeu, entao o PDF recebe so o que
 * ainda pode desenhar em vez de falhar por causa de uma chave orfa.
 */
export function imageBytesFor(
        images: Record<string, { assetId: string }>
): Map<string, Uint8Array> {
        const bytes = new Map<string, Uint8Array>();

        for (const image of Object.values(images)) {
                const stored = store.get(image.assetId);

                if (stored) {
                        bytes.set(image.assetId, stored.bytes);
                }
        }

        return bytes;
}

/** So para teste: zera o store e o contador entre casos. */
export function resetImageStore(): void {
        store.clear();
        sequencia = 0;
}
