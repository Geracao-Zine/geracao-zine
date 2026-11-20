import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const moduloPdf = join(raiz, "src/lib/pdf");

// O modulo de PDF roda no servidor e no navegador, mas nunca dentro do React:
// ele recebe um modelo pronto. Estas duas funcoes de disco alimentam o fetch
// com os TTFs de public/, que e o que o navegador faria.
globalThis.fetch = async (url) => {
	const bytes = readFileSync(join(raiz, "public", url));
	return {
		ok: true,
		arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
	};
};

const { generateReadingPdf } = await import("../src/lib/pdf/reading.ts");

const cenario = {
	coverTitle: "Meu Zine Teste",
	authorName: "Steve",
	titleFont: "geistMono",
	authorFont: "geistSans",
	date: "19/11/2026",
	poems: [
		{
			title: "Primeiro poema",
			subtitle: "um subtítulo",
			date: "19/11/2026",
			body: "coração ação linguiça avó São Paulo\n\nsegunda estrofe",
		},
		{ title: "", subtitle: "", date: "", body: "poema sem titulo" },
	],
};

function comRelogioFixo(fn) {
	const RealDate = Date;
	globalThis.Date = class extends RealDate {
		constructor(...args) {
			super(...(args.length ? args : [1770000000000]));
		}
		static now() {
			return 1770000000000;
		}
	};

	return fn().finally(() => {
		globalThis.Date = RealDate;
	});
}

test("o modulo de PDF nao importa React", () => {
	const arquivos = readdirSync(moduloPdf).filter((nome) => nome.endsWith(".ts"));

	assert.ok(arquivos.length > 0, "esperava arquivos em src/lib/pdf");

	for (const nome of arquivos) {
		const fonte = readFileSync(join(moduloPdf, nome), "utf8");
		assert.ok(
			!/from\s+["']react["']|from\s+["']react\//.test(fonte),
			`${nome} importa React`
		);
	}
});

test("o modulo de PDF nao importa pdf-lib estaticamente", () => {
	const arquivos = readdirSync(moduloPdf).filter((nome) => nome.endsWith(".ts"));

	for (const nome of arquivos) {
		const fonte = readFileSync(join(moduloPdf, nome), "utf8");
		const estatico = /^\s*import\s+(?!type\b)[^;]*from\s+["']pdf-lib["']/m.test(fonte);
		assert.ok(!estatico, `${nome} importa pdf-lib estaticamente`);
	}
});

test("generateReadingPdf gera um PDF valido", async () => {
	const bytes = await generateReadingPdf(cenario);

	assert.ok(bytes instanceof Uint8Array);
	assert.ok(bytes.length > 1000);

	const assinatura = new TextDecoder().decode(bytes.slice(0, 5));
	assert.equal(assinatura, "%PDF-");

	const doc = await PDFDocument.load(bytes);
	// capa + um poema por pagina
	assert.equal(doc.getPageCount(), 3);
});

test("generateReadingPdf e deterministico com o relogio fixo", async () => {
	const primeiro = await comRelogioFixo(() => generateReadingPdf(cenario));
	const segundo = await comRelogioFixo(() => generateReadingPdf(cenario));

	assert.deepEqual(primeiro, segundo);
});

test("generateReadingPdf quebra pagina quando o poema nao cabe", async () => {
	const verso = Array.from({ length: 80 }, (_, i) => `linha ${i + 1}`).join("\n");
	const bytes = await generateReadingPdf({
		...cenario,
		poems: [{ title: "Longo", subtitle: "", date: "", body: verso }],
	});

	const doc = await PDFDocument.load(bytes);
	// capa + varias paginas do mesmo poema
	assert.ok(doc.getPageCount() > 2, `esperava mais de 2 paginas, veio ${doc.getPageCount()}`);
});

test("generateReadingPdf aceita zine sem autor", async () => {
	const bytes = await generateReadingPdf({ ...cenario, authorName: "" });

	const doc = await PDFDocument.load(bytes);
	assert.equal(doc.getPageCount(), 3);
});

test("generateReadingPdf aceita zine sem poemas", async () => {
	const bytes = await generateReadingPdf({ ...cenario, poems: [] });

	const doc = await PDFDocument.load(bytes);
	assert.equal(doc.getPageCount(), 1);
});

test("campo opcional vazio nao reserva espaco no PDF", async () => {
        const { PANEL_HEIGHT, POEM_LINE_HEIGHT } = await import("../src/lib/pdf/layout.ts");
        // Quantas linhas cabem na caixa quando nao ha cabecalho nenhum.
        const capacidade = Math.floor(PANEL_HEIGHT / POEM_LINE_HEIGHT);
        const corpo = Array.from({ length: capacidade }, (_, i) => `verso ${i + 1}`).join("\n");

        const semCampos = await generateReadingPdf({
                ...cenario,
                poems: [{ title: "", subtitle: "", date: "", body: corpo }],
        });
        const comCampos = await generateReadingPdf({
                ...cenario,
                poems: [
                        {
                                title: "Título",
                                subtitle: "Subtítulo",
                                date: "19/11/2026",
                                body: corpo,
                        },
                ],
        });

        // Sem cabecalho o texto ocupa a area inteira numa pagina so; com os
        // tres campos preenchidos a mesma quantidade de verso transborda.
        assert.equal((await PDFDocument.load(semCampos)).getPageCount(), 2);
        assert.ok((await PDFDocument.load(comCampos)).getPageCount() > 2);
});
