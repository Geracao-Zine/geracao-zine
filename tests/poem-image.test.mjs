import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { PDFDocument, StandardFonts } from "pdf-lib";

const { imageRect, imageClip } = await import("../src/lib/pdf/image-layout.ts");
const { layoutPanel } = await import("../src/lib/pdf/panel.ts");
const { generateZinePdf } = await import("../src/lib/pdf/zine.ts");
const { naturalSize } = await import("../src/lib/image-file.ts");
const {
        ACCEPTED_IMAGE_TYPES,
        imageBytesFor,
        isAcceptedImageType,
        putImage,
        getImage,
        resetImageStore,
} = await import("../src/lib/image-store.ts");
const { IMAGE_BAND_RATIO } = await import("../src/lib/pdf/layout.ts");
const { layoutPreview } = await import("../src/lib/preview/index.ts");
const { pageImageFrom } = await import("../src/domain/image.ts");

const Tabela = new Uint32Array(256);

for (let n = 0; n < 256; n += 1) {
        let c = n;

        for (let k = 0; k < 8; k += 1) {
                c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }

        Tabela[n] = c >>> 0;
}

function crc32(bytes) {
        let crc = 0xffffffff;

        for (const byte of bytes) {
                crc = Tabela[(crc ^ byte) & 0xff] ^ (crc >>> 8);
        }

        return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo, dados) {
        const tamanho = Buffer.alloc(4);
        tamanho.writeUInt32BE(dados.length);

        const corpo = Buffer.concat([Buffer.from(tipo, "latin1"), dados]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(corpo));

        return Buffer.concat([tamanho, corpo, crc]);
}

/** PNG RGB solido, para exercitar o caminho real do `embedPng`. */
function png(width, height) {
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(width, 0);
        ihdr.writeUInt32BE(height, 4);
        ihdr[8] = 8;
        ihdr[9] = 2;

        const linhas = [];

        for (let y = 0; y < height; y += 1) {
                const linha = Buffer.alloc(1 + width * 3);
                linha[0] = 0;
                linhas.push(linha);
        }

        return new Uint8Array(
                Buffer.concat([
                        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
                        chunk("IHDR", ihdr),
                        chunk("IDAT", deflateSync(Buffer.concat(linhas))),
                        chunk("IEND", Buffer.alloc(0)),
                ])
        );
}

const imagem = (extra = {}) => ({
        assetId: "img-1",
        naturalWidth: 400,
        naturalHeight: 200,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        ...extra,
});

const pdfDoc = await PDFDocument.create();
const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
const fonts = { title: regular, subtitle: regular, date: regular, body: regular };

const pagina = { title: "Título", subtitle: "Subtítulo", date: "19/11/2026", body: "um verso" };

test("a imagem cabe inteira na caixa quando scale e 1", () => {
        const rect = imageRect(imagem(), { width: 200, height: 200 });

        assert.equal(rect.width, 200);
        assert.equal(rect.height, 100);
});

test("a imagem nunca estica: a proporcao do arquivo e preservada", () => {
        const rect = imageRect(imagem({ naturalWidth: 1000, naturalHeight: 1000 }), {
                width: 400,
                height: 100,
        });

        assert.equal(rect.width, rect.height);
        assert.equal(rect.height, 100);
});

test("escala maior que 1 amplia e passa a sobrar imagem fora da caixa", () => {
        const rect = imageRect(imagem({ scale: 2 }), { width: 200, height: 200 });

        assert.equal(rect.width, 400);
        assert.equal(rect.height, 200);
});

test("sem tamanho natural nao ha retangulo para desenhar", () => {
        assert.equal(imageRect(imagem({ naturalWidth: 0 }), { width: 100, height: 100 }), null);
        assert.equal(imageRect(imagem(), { width: 0, height: 100 }), null);
});

test("o recorte nunca passa da caixa do painel", () => {
        const rect = imageRect(imagem({ scale: 4 }), { width: 200, height: 200 });
        const clip = imageClip(rect, { width: 200, height: 200 });

        assert.equal(clip.x, 0);
        assert.equal(clip.y, 0);
        assert.equal(clip.width, 200);
        assert.equal(clip.height, 200);
});

test("a imagem reserva uma faixa no topo e so aparece na primeira pagina", () => {
        const [primeira] = layoutPanel(pagina, fonts, 600, 300, 0, imagem());

        assert.ok(primeira.image);
        assert.equal(primeira.image.assetId, "img-1");
        assert.ok(primeira.image.height <= 600 * IMAGE_BAND_RATIO + 0.001);
});

test("sem imagem o layout nao reserva faixa", () => {
        const [semImagem] = layoutPanel(pagina, fonts, 600, 300, 0, null);
        const [comImagem] = layoutPanel(pagina, fonts, 600, 300, 0, imagem());

        assert.equal(semImagem.image, null);
        assert.equal(semImagem.imageBox, null);
        assert.ok(comImagem.box.top > semImagem.box.top);
});

test("a caixa da imagem para na faixa, para a foto ampliada nao invadir o texto", () => {
        const [primeira] = layoutPanel(pagina, fonts, 600, 300, 0, imagem());

        assert.equal(primeira.imageBox.height, 600 * IMAGE_BAND_RATIO);
        assert.equal(primeira.imageBox.width, 300);
});

test("a continuacao nao repete a imagem nem a caixa dela", () => {
        const longa = { ...pagina, body: Array.from({ length: 400 }, () => "verso").join("\n") };
        const paginas = layoutPanel(longa, fonts, 200, 200, 0, imagem());

        assert.ok(paginas.length > 1);
        assert.ok(paginas[0].image);
        assert.ok(paginas[0].imageBox);
        assert.ok(paginas.slice(1).every((continuacao) => continuacao.image === null));
        assert.ok(paginas.slice(1).every((continuacao) => continuacao.imageBox === null));
});

test("o preview mede a imagem na mesma caixa que o PDF", () => {
        const painel = { width: 300, height: 600 };

        const doPdf = layoutPanel(pagina, fonts, painel.height, painel.width, 12, imagem())[0];
        const doPreview = layoutPreview(pagina, fonts, painel, 12, imagem())[0];

        assert.deepEqual(doPreview.image, doPdf.image);
        assert.deepEqual(doPreview.imageBox, doPdf.imageBox);
});

test("o PNG tem o tamanho lido do cabecalho, sem decodificar", () => {
        assert.deepEqual(naturalSize(png(7, 3)), { width: 7, height: 3 });
});

test("bytes que nao sao PNG nem JPEG nao viram tamanho", () => {
        assert.equal(naturalSize(new Uint8Array([1, 2, 3, 4])), null);
});

test("o store devolve os mesmos bytes que guardou", () => {
        resetImageStore();
        const bytes = png(2, 2);
        const assetId = putImage(bytes, "image/png");

        assert.equal(getImage(assetId).mime, "image/png");
        assert.deepEqual(getImage(assetId).bytes, bytes);
});

test("imageBytesFor ignora chave que a sessao ja perdeu", () => {
        resetImageStore();
        const assetId = putImage(png(2, 2), "image/png");

        const bytes = imageBytesFor({
                ok: { assetId },
                perdida: { assetId: "img-que-nao-existe" },
        });

        assert.deepEqual([...bytes.keys()], [assetId]);
});

test("so PNG e JPEG sao aceitos, que sao os formatos que o pdf-lib embute", () => {
        assert.deepEqual([...ACCEPTED_IMAGE_TYPES], ["image/png", "image/jpeg"]);
        assert.equal(isAcceptedImageType("image/png"), true);
        assert.equal(isAcceptedImageType("image/gif"), false);
});

function temImagem(doc) {
        return doc.context
                .enumerateIndirectObjects()
                .some(([, objeto]) => objeto.toString().includes("/Subtype /Image"));
}

const cenarioBase = {
        coverTitle: "Capa",
        authorName: "Autora",
        titleFont: "geistMono",
        authorFont: "geistSans",
        date: "19/11/2026",
        format: "banner-a4",
        printMode: "simplex",
};

test("o PDF embute a imagem do poema", async () => {
        resetImageStore();
        const bytes = png(4, 2);
        const assetId = putImage(bytes, "image/png");

        const comImagem = await generateZinePdf({
                ...cenarioBase,
                poems: [{ ...pagina, image: imagem({ assetId }) }],
                images: new Map([[assetId, bytes]]),
        });

        const semImagem = await generateZinePdf({
                ...cenarioBase,
                poems: [{ ...pagina }],
        });

        // O contraste e o que prova que o objeto veio da imagem, e nao de outro
        // recurso que o PDF ja carrega por conta propria.
        assert.equal(temImagem(await PDFDocument.load(semImagem)), false);
        assert.equal(temImagem(await PDFDocument.load(comImagem)), true);
});

test("sem os bytes a imagem e ignorada em vez de quebrar a geracao", async () => {
        const saida = await generateZinePdf({
                ...cenarioBase,
                poems: [{ ...pagina, image: imagem({ assetId: "sumiu" }) }],
        });

        assert.equal(new TextDecoder().decode(saida.slice(0, 5)), "%PDF-");
        assert.equal(temImagem(await PDFDocument.load(saida)), false);
});

// --- 7.1: normalizacao do JSON salvo ---------------------------------------

test("a imagem sobrevive a ida e volta por JSON", () => {
        const original = imagem({ scale: 2.5, offsetX: -0.4, offsetY: 0.3 });
        const voltou = pageImageFrom(JSON.parse(JSON.stringify(original)));

        assert.deepEqual(voltou, original);
});

test("dado corrompido cai no padrao em vez de quebrar o rascunho", () => {
        // o JSON de um rascunho antigo pode ter qualquer coisa nestes campos;
        // normalizar e o que impede a pagina inteira de virar NaN
        const voltou = pageImageFrom({
                assetId: "img-1",
                naturalWidth: "400",
                naturalHeight: null,
                scale: -3,
                offsetX: "muito",
                offsetY: Number.NaN,
        });

        assert.deepEqual(voltou, {
                assetId: "img-1",
                naturalWidth: 0,
                naturalHeight: 0,
                scale: 1,
                offsetX: 0,
                offsetY: 0,
        });
});

test("sem assetId nao existe imagem", () => {
        assert.equal(pageImageFrom(null), null);
        assert.equal(pageImageFrom("img"), null);
        assert.equal(pageImageFrom({}), null);
        assert.equal(pageImageFrom({ assetId: "   " }), null);
        assert.equal(pageImageFrom({ assetId: 42 }), null);
});

test("a escala normalizada e sempre uniforme, nunca por eixo", () => {
        // o modelo nao tem campo de escala horizontal separado do vertical:
        // se um dia tiver, este teste falha antes de a imagem sair esticada
        const campos = Object.keys(pageImageFrom(imagem()));

        assert.equal(campos.includes("scaleX"), false);
        assert.equal(campos.includes("scaleY"), false);
        assert.equal(campos.filter((c) => c.startsWith("scale")).length, 1);
});

test("a razao de aspecto do arquivo sobrevive a qualquer escala", () => {
        const razao = 1600 / 900;

        for (const scale of [0.5, 1, 2, 8]) {
                const rect = imageRect(imagem({ naturalWidth: 1600, naturalHeight: 900, scale }), {
                        width: 300,
                        height: 300,
                });

                assert.ok(Math.abs(rect.width / rect.height - razao) < 1e-9, `escala ${scale} deformou`);
        }
});

test("a escala absurda e limitada em vez de virar imagem gigante", () => {
        const razoavel = imageRect(imagem({ scale: 8 }), { width: 100, height: 100 });
        const absurda = imageRect(imagem({ scale: 10000 }), { width: 100, height: 100 });

        // sem o teto, um scale corrompido no JSON inflaria o PDF e a memoria
        assert.deepEqual(absurda, razoavel);
        assert.ok(absurda.width < 10000);
});
