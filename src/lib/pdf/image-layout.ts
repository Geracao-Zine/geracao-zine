import type { PageImage } from "../../domain/image.ts";
import { hasDrawableSize } from "../../domain/image.ts";
import { IMAGE_MAX_SCALE, IMAGE_MIN_SCALE } from "./layout.ts";

/**
 * Retangulo de desenho da imagem, em pontos, medido a partir do canto superior
 * esquerdo do painel (mesma origem dos `PanelRun`, para preview e PDF
 * desenharem na mesma coordenada).
 */
export type ImageRect = {
        x: number;
        y: number;
        width: number;
        height: number;
};

/** Caixa util onde a imagem pode aparecer: o painel menos a margem de seguranca. */
export type ImageBox = {
        width: number;
        height: number;
};

/**
 * Encaixa a imagem na caixa mantendo a proporcao, sem nunca esticar.
 *
 * `scale = 1` significa "cabe inteira na caixa": o lado maior encosta na borda.
 * Valores maiores ampliam simetricamente, e a imagem passa a ser recortada pela
 * caixa. E a base do redimensionamento com proporcao travada.
 */
export function imageRect(image: PageImage, box: ImageBox): ImageRect | null {
        if (!hasDrawableSize(image)) {
                return null;
        }

        const larguraCaixa = Math.max(0, box.width);
        const alturaCaixa = Math.max(0, box.height);

        if (larguraCaixa === 0 || alturaCaixa === 0) {
                return null;
        }

        // O menor dos dois fatores e o que faz a imagem caber inteira.
        const encaixe = Math.min(
                larguraCaixa / image.naturalWidth,
                alturaCaixa / image.naturalHeight
        );
        // O teto protege contra um `scale` absurdo vindo de JSON corrompido:
        // ampliar alem disso so gasta memoria com pixel que a impressao perde.
        const escala = Math.min(Math.max(image.scale, IMAGE_MIN_SCALE), IMAGE_MAX_SCALE);
        const fator = encaixe * escala;
        const width = image.naturalWidth * fator;
        const height = image.naturalHeight * fator;

        // Deslocamento em fracao da caixa: 0 centraliza, e o limite mantem a
        // imagem sempre cobrindo a caixa, sem abrir faixa branca.
        const sobraX = Math.max(0, width - larguraCaixa);
        const sobraY = Math.max(0, height - alturaCaixa);
        const x = -sobraX / 2 + image.offsetX * sobraX;
        const y = -sobraY / 2 + image.offsetY * sobraY;

        return { x, y, width, height };
}

/**
 * Recorta o retangulo da imagem na caixa do painel.
 *
 * O PDF recorta com `clip`, e o preview com `clipPath`: os dois precisam do
 * mesmo retangulo, senao o que aparece na tela nao e o que sai na impressao.
 */
export function imageClip(rect: ImageRect, box: ImageBox): ImageRect {
        const x = Math.max(0, rect.x);
        const y = Math.max(0, rect.y);

        return {
                x,
                y,
                width: Math.min(box.width - x, rect.x + rect.width - x),
                height: Math.min(box.height - y, rect.y + rect.height - y),
        };
}
