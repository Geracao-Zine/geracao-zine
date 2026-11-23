import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

const {
	DEFAULT_FORMAT,
	FORMAT_OPTIONS,
	isFormatAvailable,
	coverFromParams,
	titleClassOf,
	authorClassOf,
	formatDate,
	isCoverComplete,
	positionOf,
	createDoc,
	addPage,
} = await import("../src/domain/index.ts");

function ler(rel) {
	return readFileSync(join(raiz, rel), "utf8");
}

function arquivos(rel) {
	const base = join(raiz, rel);
	return readdirSync(base, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => join(rel, e.name, "index.tsx"))
		.filter((p) => {
			try {
				readFileSync(join(raiz, p));
				return true;
			} catch {
				return false;
			}
		});
}

test("as quatro dobras basicas estao disponiveis", () => {
	assert.equal(DEFAULT_FORMAT, "banner-a4");

	for (const id of [
		"banner-a4",
		"duas-colunas-vertical",
		"duas-colunas-horizontal",
		"quatro-retangulos",
	]) {
		assert.equal(isFormatAvailable(id), true, `${id} deveria estar disponivel`);
	}

	assert.equal(isFormatAvailable("mini-zine"), true);
	assert.equal(isFormatAvailable("saddle-stitch"), true);
});

test("o seletor mostra as seis dobras", () => {
	assert.deepEqual(
		FORMAT_OPTIONS.map((o) => o.id),
		[
			"banner-a4",
			"duas-colunas-vertical",
			"duas-colunas-horizontal",
			"quatro-retangulos",
			"mini-zine",
			"saddle-stitch",
		]
	);
});

test("isFormatAvailable devolve false para formato desconhecido", () => {
	assert.equal(isFormatAvailable("inexistente"), false);
});

test("coverFromParams le os campos da URL", () => {
	const params = new Map([
		["coverTitle", "Meu Zine"],
		["authorName", "Steve"],
		["titleFont", "geistMono"],
		["authorFont", "geistSans"],
	]);

	const cover = coverFromParams({ get: (k) => params.get(k) ?? null });

	assert.equal(cover.title, "Meu Zine");
	assert.equal(cover.author, "Steve");
	assert.equal(cover.titleFont, "geistMono");
	assert.equal(cover.authorFont, "geistSans");
});

test("coverFromParams cai na fonte padrao quando a URL vem vazia", () => {
	const cover = coverFromParams({ get: () => null });

	assert.equal(cover.title, "");
	assert.equal(cover.author, "");
	assert.equal(cover.titleFont, "geistSans");
	assert.equal(cover.authorFont, "geistSans");
});

test("coverFromParams aceita a classe CSS legada da fonte", () => {
	const params = new Map([
		["titleFont", "font-mono"],
		["authorFont", "font-sans"],
	]);
	const cover = coverFromParams({ get: (k) => params.get(k) ?? null });

	assert.equal(cover.titleFont, "geistMono");
	assert.equal(titleClassOf(cover), "font-mono");
	assert.equal(cover.authorFont, "geistSans");
	assert.equal(authorClassOf(cover), "font-sans");
});

test("formatDate usa o padrao brasileiro", () => {
	// 15/03/2026 em UTC
	assert.equal(formatDate(Date.UTC(2026, 2, 15, 12)), "15/03/2026");
});

test("isCoverComplete exige titulo e autor", () => {
	const base = { title: "", author: "", titleFont: "geistSans", authorFont: "geistSans" };

	assert.equal(isCoverComplete(base), false);
	assert.equal(isCoverComplete({ ...base, title: "Zine" }), false);
	assert.equal(isCoverComplete({ ...base, author: "Steve" }), false);
	assert.equal(isCoverComplete({ ...base, title: "Zine", author: "Steve" }), true);
});

test("positionOf numera a partir de 1 ignorando a capa", () => {
	const doc = addPage(createDoc());
	const poemas = doc.pages.filter((p) => p.kind === "poem");

	assert.equal(positionOf(doc, poemas[0].id), 1);
	assert.equal(positionOf(doc, poemas[1].id), 2);
});

test("nenhum componente de tela gera PDF", () => {
	for (const caminho of arquivos("src/components")) {
		const fonte = ler(caminho);
		assert.ok(
			!/generateZinePdf|lib\/pdf/.test(fonte),
			`${caminho} gera PDF diretamente`
		);
	}
});

test("nenhuma pagina de rota gera PDF diretamente", () => {
	const rotas = ["src/app/Editor/page.tsx", "src/app/Create/page.tsx"];

	for (const rota of rotas) {
		const fonte = ler(rota);
		assert.ok(
			!/from "@\/lib\/pdf"/.test(fonte),
			`${rota} importa o motor de PDF; deve delegar ao hook`
		);
	}
});

test("o hook e o unico ponto que chama o motor de PDF", () => {
	const hook = ler("src/hooks/useZineEditor.ts");
	assert.ok(hook.includes("generateZinePdf"), "o hook deve gerar o PDF");
});
