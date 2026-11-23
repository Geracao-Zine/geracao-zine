import { fontById } from "../fonts.ts";
import { embedZineFonts } from "./fonts.ts";
import { effectivePrintMode, imposeZine } from "./imposition.ts";
import type { ImposedFace } from "./imposition.ts";
import type { PDFPage } from "pdf-lib";
import { POEM_DIVIDER_COLOR, POEM_DIVIDER_THICKNESS } from "./layout.ts";
import { layoutPanel } from "./panel.ts";
import type { PanelFonts, PanelPageLayout, PanelRun } from "./panel.ts";
import { panelFontsFrom } from "./panel-fonts.ts";
import { panelSize, templateFor } from "./templates.ts";
import type { ImpositionTemplate } from "./templates.ts";
import type { ZinePdfInput } from "./types.ts";

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
        // O autor da capa usa a fonte escolhida para ele, nao a do titulo.
        const coverFonts: PanelFonts = { ...fonts, subtitle: authorFonts.regular };
        const mode = effectivePrintMode(template, input.printMode);
        const cover = coverPanel(template, input, coverFonts);
        const sheets = imposeZine({ template, poems: input.poems, fonts, mode, cover });
        const fontsFor = (layout: PanelPageLayout): PanelFonts =>
                layout === cover ? coverFonts : fonts;

        for (const sheet of sheets) {
                drawFace(pdfDoc.addPage([width, height]), sheet.front, fontsFor, rgb, degrees);

                if (sheet.back) {
                        drawFace(pdfDoc.addPage([width, height]), sheet.back, fontsFor, rgb, degrees);
                }
        }

        // O duplex le a pilha em pares: com numero impar de paginas a ultima
        // frente ficaria sozinha e receberia a proxima folha no verso.
        if (mode === "duplex" && pdfDoc.getPageCount() % 2 === 1) {
                pdfDoc.addPage([width, height]);
        }

        return pdfDoc.save();
}

/** Capa diagramada num painel, no lugar da pagina 1 da dobra. */
function coverPanel(
        template: ImpositionTemplate,
        input: ZinePdfInput,
        fonts: PanelFonts
): PanelPageLayout {
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
        fontsFor: (layout: PanelPageLayout) => PanelFonts,
        rgb: Rgb,
        degrees: (angle: number) => ReturnType<typeof import("pdf-lib").degrees>
): void {
        face.panels.forEach((layout, index) => {
                if (!layout) {
                        return;
                }

                const fonts = fontsFor(layout);
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
