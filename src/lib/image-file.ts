/**
 * Le o tamanho natural de um PNG ou JPEG a partir dos proprios bytes.
 *
 * O navegador nao expoe as dimensoes de um arquivo sem decodifica-lo num
 * elemento de imagem, e esse caminho assincrono depende do DOM. Ler o cabecalho
 * aqui deixa a funcao pura, testavel em Node e independente do layout da tela.
 */

export type ImageSize = {
        width: number;
        height: number;
};

function pngSize(bytes: Uint8Array): ImageSize | null {
        // Assinatura PNG: 89 50 4E 47 0D 0A 1A 0A. O IHDR comeca logo depois e
        // traz largura e altura em big-endian, com 4 bytes cada.
        if (bytes.length < 24) {
                return null;
        }

        if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
                return null;
        }

        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const width = view.getUint32(16);
        const height = view.getUint32(20);

        return width > 0 && height > 0 ? { width, height } : null;
}

function jpegSize(bytes: Uint8Array): ImageSize | null {
        if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
                return null;
        }

        let offset = 2;

        // Percorre os segmentos ate o SOF, que e onde as dimensoes aparecem.
        while (offset + 9 < bytes.length) {
                if (bytes[offset] !== 0xff) {
                        offset += 1;
                        continue;
                }

                const marker = bytes[offset + 1];
                const length = (bytes[offset + 2] << 8) | bytes[offset + 3];

                // SOF0..SOF15, exceto os marcadores que nao carregam tamanho.
                if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                        const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
                        const width = (bytes[offset + 7] << 8) | bytes[offset + 8];

                        return width > 0 && height > 0 ? { width, height } : null;
                }

                offset += 2 + length;
        }

        return null;
}

/** Tamanho do PNG ou JPEG, ou null quando o formato nao e suportado. */
export function naturalSize(bytes: Uint8Array): ImageSize | null {
        return pngSize(bytes) ?? jpegSize(bytes);
}
