import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
	createDoc,
	addPage,
	removePage,
	setPoemField,
	poemPages,
	coverOf,
} from "../src/lib/zine-pages.ts";

test("o documento comeca com uma capa tipada e uma pagina de poema", () => {
	const doc = createDoc();

	assert.equal(doc.pages.length, 2);
	assert.equal(doc.pages[0].kind, "cover");
	assert.equal(doc.pages[1].kind, "poem");
});

test("a capa e identificada pelo tipo, nao pela posicao", () => {
	const doc = addPage(addPage(createDoc()));
	const cover = coverOf(doc);

	assert.ok(cover);
	assert.equal(cover.kind, "cover");
	assert.equal(poemPages(doc).length, 3);
	assert.equal(poemPages(doc).some((page) => page.id === cover.id), false);
});

test("remover uma pagina do meio preserva o conteudo das demais", () => {
	let doc = addPage(addPage(createDoc()));
	const poems = poemPages(doc);
	const [first, middle, last] = poems;

	doc = setPoemField(doc, first.id, "poetry", "primeiro");
	doc = setPoemField(doc, middle.id, "poetry", "meio");
	doc = setPoemField(doc, last.id, "poetry", "ultimo");

	doc = removePage(doc, middle.id);

	const remaining = poemPages(doc);

	assert.equal(remaining.length, 2);
	assert.equal(remaining[0].poetry, "primeiro");
	assert.equal(remaining[1].poetry, "ultimo");
});

test("adicionar depois de remover nao gera id duplicado", () => {
	let doc = addPage(addPage(createDoc()));
	const middle = poemPages(doc)[1];

	doc = removePage(doc, middle.id);
	doc = addPage(doc);
	doc = addPage(doc);

	const ids = doc.pages.map((page) => page.id);

	assert.equal(new Set(ids).size, ids.length);
	assert.equal(doc.pages.length, 5);
});

test("a capa nao pode ser removida", () => {
	const doc = createDoc();
	const cover = coverOf(doc);

	const after = removePage(doc, cover.id);

	assert.equal(after, doc);
	assert.ok(coverOf(after));
});

test("remover um id inexistente nao altera o documento", () => {
	const doc = createDoc();
	const after = removePage(doc, "nao-existe");

	assert.equal(after, doc);
});

test("editar um campo de poema nao afeta as outras paginas", () => {
	let doc = addPage(createDoc());
	const [first, second] = poemPages(doc);

	doc = setPoemField(doc, first.id, "title", "Sonho");

	assert.equal(poemPages(doc)[0].title, "Sonho");
	assert.equal(poemPages(doc)[1].title, "");
	assert.equal(second.title, "");
});

test("setPoemField ignora ids de capa", () => {
	const doc = createDoc();
	const cover = coverOf(doc);

	const after = setPoemField(doc, cover.id, "title", "x");

	assert.equal(after.pages[0].kind, "cover");
	assert.equal("title" in after.pages[0], false);
});

test("Editor page nao usa mais o modelo de numeros paralelos", () => {
	const source = readFileSync(
		fileURLToPath(new URL("../src/app/Editor/page.tsx", import.meta.url)),
		"utf8"
	);

	for (const legacy of ["pageList", "PageContent", "Record<number"]) {
		assert.ok(!source.includes(legacy), `${legacy} deveria ter sido removido`);
	}

	assert.ok(source.includes("@/lib/zine-pages"), "o Editor deve consumir o modelo");
});
