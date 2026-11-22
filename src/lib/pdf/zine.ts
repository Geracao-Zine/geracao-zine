import { fontById } from "../fonts.ts";
import { wrapText } from "../wrap-text.ts";
import { embedZineFonts } from "./fonts.ts";
import { imposeSheets } from "./imposition.ts";
import type { ImposedFace } from "./imposition.ts";
import type { PDFPage } from "pdf-lib";
import {
        COVER_AUTHOR_SIZE,
        COVER_DATE_COLOR,
        COVER_DATE_SIZE,
        COVER_DIVIDER_COLOR,
        COVER_DIVIDER_THICKNESS,
        COVER_DIVIDER_WIDTH,
        COVER_GAP_AUTHOR_TO_DATE,
        COVER_GAP_TITLE_TO_AUTHOR,
        COVER_TITLE_LINE_HEIGHT,
        COVER_TITLE_SIZE,
        PAGE_MARGIN,
        POEM_DIVIDER_COLOR,
        POEM_DIVIDER_THICKNESS,
} from "./layout.ts";
import type { PanelFonts, PanelRun } from "./panel.ts";
import { panelFontsFrom } from "./panel-fonts.ts";
import { templateFor } from "./templates.ts";
import type { ZinePdfInput } from "./types.ts";

/**
 * Gera o PDF do zine: capa e faces do template escolhido.
 *
 * A capa ocupa uma folha inteira, na mesma orientacao da dobra. Cada face
 * seguinte recebe os paineis na ordem de leitura do template.
 */
export async function generateZinePdf(input: ZinePdfInput): Promise<Uint8Array> {
        const template = templateFor(input.format);

        if (!template) {
                throw new Error(`dobra sem imposicao implementada: ${input.format}`);
        }

        // pdf-lib e fontkit entram so aqui: nada disso vai para o bundle inicial.
        const [{ PDFDocument, StandardFonts, rgb }, fontkit] = await Promise.all([
                import("pdf-lib"),
                import("@pdf-lib/fontkit").then((mod) => mod.default),
        ]);

        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        const standard = {
                regular: StandardFonts.Helvetica,
                bold: StandardFonts.HelveticaBold,
                italic: StandardFonts.HelveticaOblique,
        };

        const titleFonts = await embedZineFonts(pdfDoc, fontById(input.titleFont), standard);
        const authorFonts = await embedZineFonts(pdfDoc, fontById(input.authorFont), standard);

        const { width, height } = template.sheet;
        const contentWidth = width - PAGE_MARGIN * 2;

        // ---------- CAPA ----------
        const coverPage = pdfDoc.addPage([width, height]);

        const titleLines = wrapText(input.coverTitle, titleFonts.bold, COVER_TITLE_SIZE, contentWidth);
        const titleBlockHeight = titleLines.length * COVER_TITLE_LINE_HEIGHT;
        const temAutor = Boolean(input.authorName);
        const temData = Boolean(input.date);

        // Blocos vazios nao entram na conta: sem isso a capa sem data ficaria
        // deslocada para cima, com o espaco da data reservado no vazio.
        const authorBlockHeight = temAutor
                ? COVER_AUTHOR_SIZE + (temData ? COVER_GAP_AUTHOR_TO_DATE + COVER_DATE_SIZE : 0)
                : 0;
        const totalBlockHeight =
                titleBlockHeight +
                COVER_GAP_TITLE_TO_AUTHOR +
                authorBlockHeight +
                (temData ? COVER_DATE_SIZE : 0);

        let cursorY = height / 2 + totalBlockHeight / 2;

        for (const line of titleLines) {
                const lineWidth = titleFonts.bold.widthOfTextAtSize(line, COVER_TITLE_SIZE);
                coverPage.drawText(line, {
                        x: (width - lineWidth) / 2,
                        y: cursorY,
                        size: COVER_TITLE_SIZE,
                        font: titleFonts.bold,
                });
                cursorY -= COVER_TITLE_LINE_HEIGHT;
        }

        cursorY -= COVER_GAP_TITLE_TO_AUTHOR / 2;
        coverPage.drawLine({
                start: { x: (width - COVER_DIVIDER_WIDTH) / 2, y: cursorY },
                end: { x: (width + COVER_DIVIDER_WIDTH) / 2, y: cursorY },
                thickness: COVER_DIVIDER_THICKNESS,
                color: rgb(COVER_DIVIDER_COLOR, COVER_DIVIDER_COLOR, COVER_DIVIDER_COLOR),
        });
        cursorY -= COVER_GAP_TITLE_TO_AUTHOR / 2;

        if (temAutor) {
                const authorWidth = authorFonts.regular.widthOfTextAtSize(input.authorName, COVER_AUTHOR_SIZE);
                coverPage.drawText(input.authorName, {
                        x: (width - authorWidth) / 2,
                        y: cursorY,
                        size: COVER_AUTHOR_SIZE,
                        font: authorFonts.regular,
                });
                cursorY -= temData ? COVER_GAP_AUTHOR_TO_DATE + COVER_DATE_SIZE : 0;
        }

        if (temData) {
                const dateWidth = titleFonts.regular.widthOfTextAtSize(input.date, COVER_DATE_SIZE);
                coverPage.drawText(input.date, {
                        x: (width - dateWidth) / 2,
                        y: cursorY,
                        size: COVER_DATE_SIZE,
                        font: titleFonts.regular,
                        color: rgb(COVER_DATE_COLOR, COVER_DATE_COLOR, COVER_DATE_COLOR),
                });
        }

        // ---------- FACES DO ZINE ----------
        const fonts = panelFontsFrom(titleFonts);
        const duplex = input.printMode === "duplex";

        // No duplex a capa ocupa so a frente da primeira folha. Reservar o verso
        // dela mantem a regra "toda face de verso e espelhada": sem isso a
        // primeira face cairia atras da capa sem passar pelo espelho.
        if (duplex) {
                pdfDoc.addPage([width, height]);
        }

        for (const sheet of imposeSheets(template, input.poems, fonts, input.printMode)) {
                drawFace(pdfDoc.addPage([width, height]), sheet.front, fonts, rgb);

                if (sheet.back) {
                        drawFace(pdfDoc.addPage([width, height]), sheet.back, fonts, rgb);
                }
        }

        // O duplex le a pilha em pares: com numero impar de paginas a ultima
        // frente ficaria sozinha e receberia a proxima folha no verso.
        if (duplex && pdfDoc.getPageCount() % 2 === 1) {
                pdfDoc.addPage([width, height]);
        }

        return pdfDoc.save();
}

/** Desenha uma face: cada painel no seu slot, na ordem de leitura. */
function drawFace(
        page: PDFPage,
        face: ImposedFace,
        fonts: PanelFonts,
        rgb: (r: number, g: number, b: number) => ReturnType<typeof import("pdf-lib").rgb>
): void {
        face.panels.forEach((layout, index) => {
                if (!layout) {
                        return;
                }

                const slot = face.slots[index];
                const top = slot.y + slot.height;

                for (const run of layout.runs) {
                        page.drawText(run.text, {
                                x: slot.x,
                                y: top - run.baseline,
                                size: run.size,
                                font: fontOf(run, fonts),
                                color: rgb(run.color, run.color, run.color),
                        });
                }

                // Divisoria entre o cabecalho e a caixa do texto. Sem cabecalho
                // nao ha o que separar.
                if (layout.divider !== null) {
                        const dividerY = top - layout.divider;
                        page.drawLine({
                                start: { x: slot.x, y: dividerY },
                                end: { x: slot.x + slot.width, y: dividerY },
                                thickness: POEM_DIVIDER_THICKNESS,
                                color: rgb(
                                        POEM_DIVIDER_COLOR,
                                        POEM_DIVIDER_COLOR,
                                        POEM_DIVIDER_COLOR
                                ),
                        });
                }
        });
}

function fontOf(run: PanelRun, fonts: PanelFonts): PanelFonts["body"] {
        if (run.role === "title") {
                return fonts.title;
        }

        if (run.role === "body") {
                return fonts.body;
        }

        return run.role === "date" || run.role === "label" ? fonts.date : fonts.subtitle;
}
