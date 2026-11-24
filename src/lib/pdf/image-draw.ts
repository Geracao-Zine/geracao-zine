import type { PDFImage, PDFPage } from "pdf-lib";
import { imageClip } from "./image-layout.ts";
import type { ImageBox, ImageRect } from "./image-layout.ts";

/**
 * Operadores de conteudo do PDF que o desenho da imagem precisa.
 *
 * Chegam por parametro porque o modulo de PDF nao importa `pdf-lib`
 * estaticamente: a biblioteca entra so na geracao, para nao pesar no bundle
 * inicial.
 */
export type ImageOperators = {
        pushGraphicsState: () => unknown;
        popGraphicsState: () => unknown;
        moveTo: (x: number, y: number) => unknown;
        lineTo: (x: number, y: number) => unknown;
        closePath: () => unknown;
        clip: () => unknown;
        endPath: () => unknown;
        translate: (x: number, y: number) => unknown;
        rotateRadians: (angle: number) => unknown;
};

/**
 * Desenha a imagem recortada pela caixa util do painel.
 *
 * O recorte usa operadores de clipping do PDF, e nao a mascara do `drawImage`:
 * a imagem continua inteira no arquivo e o visualizador so mostra a parte
 * dentro da caixa. Assim ampliar nao perde resolucao fora do recorte e o
 * resultado e identico ao `clipPath` do preview.
 *
 * `left` e `top` sao o canto superior esquerdo da caixa em coordenadas da
 * folha, no mesmo referencial usado para desenhar o texto.
 *
 * O retangulo vem pronto do `layoutPanel`: recalcular aqui abriria a porta para
 * o PDF e o preview divergirem no enquadramento.
 */
export function drawPanelImage(
        page: PDFPage,
        embedded: PDFImage,
        rect: ImageRect,
        box: ImageBox,
        left: number,
        top: number,
        operators: ImageOperators,
        rotationDegrees = 0
): void {
        const clipRect = imageClip(rect, box);

        if (clipRect.width <= 0 || clipRect.height <= 0) {
                return;
        }

        const ops: unknown[] = [operators.pushGraphicsState()];

        // No minizine a fileira de baixo gira meia volta junto com o painel.
        // Gira em torno do centro do slot, o mesmo eixo usado no texto, para
        // imagem e texto continuarem alinhados depois da dobra.
        if (rotationDegrees !== 0) {
                const centerX = left + box.width / 2;
                const centerY = top - box.height / 2;

                ops.push(
                        operators.translate(centerX, centerY),
                        operators.rotateRadians((rotationDegrees * Math.PI) / 180),
                        operators.translate(-centerX, -centerY)
                );
        }

        ops.push(
                operators.moveTo(left + clipRect.x, top - clipRect.y),
                operators.lineTo(left + clipRect.x + clipRect.width, top - clipRect.y),
                operators.lineTo(
                        left + clipRect.x + clipRect.width,
                        top - clipRect.y - clipRect.height
                ),
                operators.lineTo(left + clipRect.x, top - clipRect.y - clipRect.height),
                operators.closePath(),
                operators.clip(),
                operators.endPath()
        );

        page.pushOperators(...(ops as Parameters<PDFPage["pushOperators"]>));

        page.drawImage(embedded, {
                x: left + rect.x,
                // O PDF desenha a partir do canto inferior esquerdo; o retangulo
                // vem medido do topo, entao a base e o topo menos a altura.
                y: top - rect.y - rect.height,
                width: rect.width,
                height: rect.height,
        });

        page.pushOperators(
                operators.popGraphicsState() as Parameters<PDFPage["pushOperators"]>[number]
        );
}
