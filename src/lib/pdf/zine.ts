import { fontById } from "../fonts.ts";
import { embedZineFonts } from "./fonts.ts";
import { effectivePrintMode, imposeZine } from "./imposition.ts";
import type { ImposedFace, ImposedSheet } from "./imposition.ts";
import type { PDFDocument, PDFImage, PDFPage } from "pdf-lib";
import {
        MARK_COLOR,
        MARK_DASH_ARRAY,
        MARK_LENGTH,
        MARK_LENGTH_RATIO,
        MARK_OFFSET,
        MARK_OFFSET_RATIO,
        MARK_THICKNESS,
        mmToPt,
} from "./layout.ts";
import { markLines } from "./marks.ts";
import { layoutPanelElements } from "./panel.ts";
import type { PanelFonts, PanelLayout } from "./panel.ts";
import { panelDrawables } from "./panel-render.ts";
import type { PanelTextDrawable } from "./panel-render.ts";
import { panelFontsFrom } from "./panel-fonts.ts";
import { panelSize, templateFor } from "./templates.ts";
import type { ImpositionTemplate } from "./templates.ts";
import type { ZinePdfInput } from "./types.ts";
import { drawPanelImage } from "./image-draw.ts";
import type { ImageOperators } from "./image-draw.ts";

type Rgb = (r: number, g: number, b: number) => ReturnType<typeof import("pdf-lib").rgb>;

/**
 * Gera o PDF do zine.
 *
 * A capa e sempre a pagina 1 do zine: entra na imposicao como os demais
 * paineis, entao ocupa o primeiro slot da dobra escolhida em vez de sair numa
 * folha separada. No duplex o verso continua espelhado a partir da frente.
 */
export async function generateZinePdf(input: ZinePdfInput): Promise<Uint8Array> {
        const template = templateFor(input.format);

        if (!template) {
                throw new Error(`dobra sem imposicao implementada: ${input.format}`);
        }

        // pdf-lib e fontkit entram so aqui: nada disso vai para o bundle inicial.
        const [
                {
                        PDFDocument,
                        StandardFonts,
                        clip,
                        closePath,
                        degrees,
                        endPath,
                        lineTo,
                        moveTo,
                        popGraphicsState,
                        pushGraphicsState,
                        rgb,
                        rotateRadians,
                        translate,
                },
                fontkit,
        ] = await Promise.all([
                import("pdf-lib"),
                import("@pdf-lib/fontkit").then((mod) => mod.default),
        ]);

        const imageOperators = {
                pushGraphicsState,
                popGraphicsState,
                moveTo,
                lineTo,
                closePath,
                clip,
                endPath,
                translate,
                rotateRadians,
        };

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
        // O autor da capa usa a fonte escolhida para ele, nao a do titulo.
        const coverFonts: PanelFonts = { ...fonts, subtitle: authorFonts.regular };
        const mode = effectivePrintMode(template, input.printMode);
        const inset = mmToPt(input.safetyMarginMm ?? 0);
        const cover = coverPanel(template, input, coverFonts, inset);
        const sheets = imposeZine({ template, poems: input.poems, fonts, mode, cover, inset });
        const fontsFor = (layout: PanelLayout): PanelFonts =>
                layout === cover ? coverFonts : fonts;
        const images = await embedImages(pdfDoc, sheets, input.images);

        for (const sheet of sheets) {
                const front = pdfDoc.addPage([width, height]);
                drawFace(front, sheet.front, fontsFor, rgb, degrees, images, imageOperators);

                if (input.marks) {
                        drawMarks(front, template, rgb);
                }

                if (sheet.back) {
                        const back = pdfDoc.addPage([width, height]);
                        drawFace(back, sheet.back, fontsFor, rgb, degrees, images, imageOperators);

                        if (input.marks) {
                                drawMarks(back, template, rgb);
                        }
                }
        }

        // O duplex le a pilha em pares: com numero impar de paginas a ultima
        // frente ficaria sozinha e receberia a proxima folha no verso.
        if (mode === "duplex" && pdfDoc.getPageCount() % 2 === 1) {
                pdfDoc.addPage([width, height]);
        }

        return pdfDoc.save();
}

/**
 * Embute uma vez cada imagem usada nas faces.
 *
 * A mesma imagem pode aparecer em mais de um painel depois da imposicao
 * (frente e verso, minizine), e o `pdf-lib` cobraria o custo de embutir de
 * novo a cada chamada. Sem os bytes — o caso de uma pagina recarregada — a
 * imagem e simplesmente ignorada.
 */
async function embedImages(
        pdfDoc: PDFDocument,
        sheets: ImposedSheet[],
        bytes: ReadonlyMap<string, Uint8Array> | undefined
): Promise<Map<string, PDFImage>> {
        const embedded = new Map<string, PDFImage>();

        if (!bytes) {
                return embedded;
        }

        const usados = new Set<string>();

        for (const sheet of sheets) {
                for (const face of [sheet.front, sheet.back]) {
                        for (const panel of face?.panels ?? []) {
                                if (panel?.image) {
                                        usados.add(panel.image.assetId);
                                }
                        }
                }
        }

        for (const assetId of usados) {
                const data = bytes.get(assetId);

                if (!data) {
                        continue;
                }

                embedded.set(assetId, await embedOne(pdfDoc, data));
        }

        return embedded;
}

/** PNG e JPEG sao os formatos que o `pdf-lib` embute sem conversao. */
async function embedOne(pdfDoc: PDFDocument, data: Uint8Array): Promise<PDFImage> {
        // O formato vem dos bytes, nao do nome do arquivo nem do MIME informado:
        // um arquivo renomeado nao pode virar erro na hora de imprimir.
        if (data[0] === 0x89 && data[1] === 0x50) {
                return pdfDoc.embedPng(data);
        }

        return pdfDoc.embedJpg(data);
}

/** Capa diagramada num painel, no lugar da pagina 1 da dobra. */
function coverPanel(
        template: ImpositionTemplate,
        input: ZinePdfInput,
        fonts: PanelFonts,
        inset: number
): PanelLayout {
        const panel = panelSize(template);

        return layoutPanelElements(
                {
                        title: input.coverTitle,
                        subtitle: input.authorName,
                        date: input.date,
                        body: "",
                },
                fonts,
                panel.height,
                panel.width,
                inset
        )[0];
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
        fontsFor: (layout: PanelLayout) => PanelFonts,
        rgb: Rgb,
        degrees: (angle: number) => ReturnType<typeof import("pdf-lib").degrees>,
        images: ReadonlyMap<string, PDFImage>,
        imageOperators: ImageOperators
): void {
        face.layouts.forEach((layout, index) => {
                if (!layout) {
                        return;
                }

                const fonts = fontsFor(layout);
                const slot = face.slots[index];
                const angle = face.rotations[index] ?? 0;
                const rotated = angle !== 0;
                const centerX = slot.x + slot.width / 2;
                const centerY = slot.y + slot.height / 2;
                const inset = layout.inset ?? 0;
                // A ordem das somas preserva os mesmos pontos do contrato antigo
                // para os paineis diagramados pelo motor.
                const pageX = (x: number) => slot.x + inset + (x - inset);
                const pageY = (y: number) => slot.y + slot.height - inset - (y - inset);
                const place = (x: number, y: number) =>
                        rotated ? { x: 2 * centerX - x, y: 2 * centerY - y } : { x, y };

                for (const item of panelDrawables(layout)) {
                        if (item.kind === "image") {
                                const embedded = images.get(item.assetId);

                                if (!embedded) {
                                        continue;
                                }

                                drawPanelImage(
                                        page,
                                        embedded,
                                        {
                                                x: item.x - inset,
                                                y: item.y - inset,
                                                width: item.width,
                                                height: item.height,
                                        },
                                        { width: item.clipWidth, height: item.clipHeight },
                                        slot.x + inset,
                                        slot.y + slot.height - inset,
                                        imageOperators,
                                        angle
                                );
                                continue;
                        }

                        if (item.kind === "rule") {
                                const y = pageY(item.y1);

                                page.drawLine({
                                        start: place(pageX(item.x1), y),
                                        end: place(pageX(item.x2), y),
                                        thickness: item.thickness,
                                        color: rgb(item.color, item.color, item.color),
                                });
                                continue;
                        }

                        page.drawText(item.text, {
                                ...place(pageX(item.x), pageY(item.y)),
                                size: item.size,
                                font: fontOf(item, fonts),
                                color: rgb(item.color, item.color, item.color),
                                ...(rotated ? { rotate: degrees(angle) } : {}),
                        });
                }
        });
}

/**
 * Desenha as marcas de corte e dobra nas bordas da folha.
 *
 * As marcas ficam fora dos paineis: os cantos ganham um L discreto e cada dobra
 * ou corte vira um risco curto na borda, tracejado para dobra e continuo para
 * corte. Desenhar dos dois lados mantem o alinhamento depois de virar a folha.
 */
export function drawMarks(page: PDFPage, template: ImpositionTemplate, rgb: Rgb): void {
        const { width, height } = template.sheet;
        const color = rgb(MARK_COLOR, MARK_COLOR, MARK_COLOR);
        const offset = Math.min(MARK_OFFSET, template.margin * MARK_OFFSET_RATIO);
        const length = Math.min(MARK_LENGTH, template.margin * MARK_LENGTH_RATIO);
        const corners = [
                { x: offset, y: height - offset, dx: 1, dy: -1 },
                { x: width - offset, y: height - offset, dx: -1, dy: -1 },
                { x: offset, y: offset, dx: 1, dy: 1 },
                { x: width - offset, y: offset, dx: -1, dy: 1 },
        ];

        for (const corner of corners) {
                page.drawLine({
                        start: { x: corner.x, y: corner.y },
                        end: { x: corner.x + corner.dx * length, y: corner.y },
                        thickness: MARK_THICKNESS,
                        color,
                });
                page.drawLine({
                        start: { x: corner.x, y: corner.y },
                        end: { x: corner.x, y: corner.y + corner.dy * length },
                        thickness: MARK_THICKNESS,
                        color,
                });
        }

        for (const line of markLines(template)) {
                const dashArray = line.kind === "fold" ? MARK_DASH_ARRAY : undefined;
                const style = {
                        thickness: MARK_THICKNESS,
                        color,
                        ...(dashArray ? { dashArray } : {}),
                };

                if (line.axis === "vertical") {
                        page.drawLine({
                                ...style,
                                start: { x: line.at, y: height },
                                end: { x: line.at, y: height - MARK_LENGTH },
                        });
                        page.drawLine({
                                ...style,
                                start: { x: line.at, y: 0 },
                                end: { x: line.at, y: MARK_LENGTH },
                        });
                } else {
                        page.drawLine({
                                ...style,
                                start: { x: 0, y: line.at },
                                end: { x: MARK_LENGTH, y: line.at },
                        });
                        page.drawLine({
                                ...style,
                                start: { x: width, y: line.at },
                                end: { x: width - MARK_LENGTH, y: line.at },
                        });
                }
        }
}

function fontOf(item: PanelTextDrawable, fonts: PanelFonts): PanelFonts["body"] {
        if (item.role === "title") {
                return fonts.title;
        }

        if (item.role === "body") {
                return fonts.body;
        }

        return item.role === "date" || item.role === "label" ? fonts.date : fonts.subtitle;
}
