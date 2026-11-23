import { fontById } from "../fonts.ts";
import { wrapText } from "../wrap-text.ts";
import { embedZineFonts } from "./fonts.ts";
import { effectivePrintMode, imposeZine } from "./imposition.ts";
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
import { layoutPanel } from "./panel.ts";
import type { PanelFonts, PanelRun } from "./panel.ts";
import { panelFontsFrom } from "./panel-fonts.ts";
import { panelSize, templateFor } from "./templates.ts";
import type { ImpositionTemplate } from "./templates.ts";
import type { ZinePdfInput } from "./types.ts";

type Rgb = (r: number, g: number, b: number) => ReturnType<typeof import("pdf-lib").rgb>;

/**
 * Gera o PDF do zine.
 *
 * Nas dobras de leitura simples a capa ocupa uma folha inteira e as faces
 * seguintes recebem os paineis na ordem de leitura. No minizine e nos cadernos
 * a capa e a pagina 1 do livrinho: entra na imposicao e e diagramada dentro de
 * um painel, como as poesias.
 */
export async function generateZinePdf(input: ZinePdfInput): Promise<Uint8Array> {
        const template = templateFor(input.format);

        if (!template) {
                throw new Error(`dobra sem imposicao implementada: ${input.format}`);
        }

        // pdf-lib e fontkit entram so aqui: nada disso vai para o bundle inicial.
        const [{ PDFDocument, StandardFonts, degrees, rgb }, fontkit] = await Promise.all([
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
        const fonts = panelFontsFrom(titleFonts);
        const mode = effectivePrintMode(template, input.printMode);
        // Nas dobras de folha unica, cadernos e frente-e-verso com paginas
        // fixas a capa e a pagina 1 do zine, entao ela entra na imposicao.
        const coverInside = template.imposition !== "sequence";

        if (!coverInside) {
                drawCover(pdfDoc.addPage([width, height]), input, titleFonts, authorFonts, rgb);

                // No duplex a capa ocupa so a frente da primeira folha. Reservar
                // o verso dela mantem a regra "toda face de verso e espelhada".
                if (mode === "duplex") {
                        pdfDoc.addPage([width, height]);
                }
        }

        const cover = coverInside ? coverPanel(template, input, fonts) : null;
        const sheets = imposeZine({ template, poems: input.poems, fonts, mode, cover });

        for (const sheet of sheets) {
                drawFace(pdfDoc.addPage([width, height]), sheet.front, fonts, rgb, degrees);

                if (sheet.back) {
                        drawFace(pdfDoc.addPage([width, height]), sheet.back, fonts, rgb, degrees);
                }
        }

        // O duplex le a pilha em pares: com numero impar de paginas a ultima
        // frente ficaria sozinha e receberia a proxima folha no verso.
        if (mode === "duplex" && !coverInside && pdfDoc.getPageCount() % 2 === 1) {
                pdfDoc.addPage([width, height]);
        }

        return pdfDoc.save();
}

/** Capa diagramada num painel do livrinho, no lugar da pagina 1. */
function coverPanel(
        template: ImpositionTemplate,
        input: ZinePdfInput,
        fonts: PanelFonts
): ReturnType<typeof layoutPanel>[number] {
        const panel = panelSize(template);

        return layoutPanel(
                {
                        title: input.coverTitle,
                        subtitle: input.authorName,
                        date: input.date,
                        body: "",
                },
                fonts,
                panel.height,
                panel.width
        )[0];
}

/** Desenha a capa de folha inteira, centrada na vertical. */
function drawCover(
        page: PDFPage,
        input: ZinePdfInput,
        titleFonts: Awaited<ReturnType<typeof embedZineFonts>>,
        authorFonts: Awaited<ReturnType<typeof embedZineFonts>>,
        rgb: Rgb
): void {
        const { width, height } = page.getSize();
        const contentWidth = width - PAGE_MARGIN * 2;

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
                page.drawText(line, {
                        x: (width - lineWidth) / 2,
                        y: cursorY,
                        size: COVER_TITLE_SIZE,
                        font: titleFonts.bold,
                });
                cursorY -= COVER_TITLE_LINE_HEIGHT;
        }

        cursorY -= COVER_GAP_TITLE_TO_AUTHOR / 2;
        page.drawLine({
                start: { x: (width - COVER_DIVIDER_WIDTH) / 2, y: cursorY },
                end: { x: (width + COVER_DIVIDER_WIDTH) / 2, y: cursorY },
                thickness: COVER_DIVIDER_THICKNESS,
                color: rgb(COVER_DIVIDER_COLOR, COVER_DIVIDER_COLOR, COVER_DIVIDER_COLOR),
        });
        cursorY -= COVER_GAP_TITLE_TO_AUTHOR / 2;

        if (temAutor) {
                const authorWidth = authorFonts.regular.widthOfTextAtSize(input.authorName, COVER_AUTHOR_SIZE);
                page.drawText(input.authorName, {
                        x: (width - authorWidth) / 2,
                        y: cursorY,
                        size: COVER_AUTHOR_SIZE,
                        font: authorFonts.regular,
                });
                cursorY -= temData ? COVER_GAP_AUTHOR_TO_DATE + COVER_DATE_SIZE : 0;
        }

        if (temData) {
                const dateWidth = titleFonts.regular.widthOfTextAtSize(input.date, COVER_DATE_SIZE);
                page.drawText(input.date, {
                        x: (width - dateWidth) / 2,
                        y: cursorY,
                        size: COVER_DATE_SIZE,
                        font: titleFonts.regular,
                        color: rgb(COVER_DATE_COLOR, COVER_DATE_COLOR, COVER_DATE_COLOR),
                });
        }
}

/**
 * Desenha uma face: cada painel no seu slot, na ordem de leitura.
 *
 * O painel do minizine na fileira de baixo sai girado 180 graus, porque a folha
 * gira meia volta ao ser dobrada. Girar em torno do centro do slot mantem o
 * conteudo dentro do painel e faz o texto aparecer em pe para o leitor.
 */
function drawFace(
        page: PDFPage,
        face: ImposedFace,
        fonts: PanelFonts,
        rgb: Rgb,
        degrees: (angle: number) => ReturnType<typeof import("pdf-lib").degrees>
): void {
        face.panels.forEach((layout, index) => {
                if (!layout) {
                        return;
                }

                const slot = face.slots[index];
                const angle = face.rotations[index] ?? 0;
                const rotated = angle !== 0;
                const centerX = slot.x + slot.width / 2;
                const centerY = slot.y + slot.height / 2;
                const place = (x: number, y: number) =>
                        rotated ? { x: 2 * centerX - x, y: 2 * centerY - y } : { x, y };

                const top = slot.y + slot.height;

                for (const run of layout.runs) {
                        page.drawText(run.text, {
                                ...place(slot.x, top - run.baseline),
                                size: run.size,
                                font: fontOf(run, fonts),
                                color: rgb(run.color, run.color, run.color),
                                ...(rotated ? { rotate: degrees(angle) } : {}),
                        });
                }

                // Divisoria entre o cabecalho e a caixa do texto. Sem cabecalho
                // nao ha o que separar.
                if (layout.divider !== null) {
                        const dividerY = top - layout.divider;
                        page.drawLine({
                                start: place(slot.x, dividerY),
                                end: place(slot.x + slot.width, dividerY),
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
