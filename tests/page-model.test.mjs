import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

const {
	EMPTY_PAGE_FIELDS,
	addPage,
	createDoc,
	createDraft,
	pageFieldsFrom,
	parseDraft,
	poemPages,
	serializeDraft,
	setPoemField,
} = await import("../src/domain/index.ts");

function ler(rel) {
	return readFileSync(join(raiz, rel), "utf8");
}

test("o modelo da pagina tem titulo, subtitulo, data e texto", () => {
	assert.deepEqual(Object.keys(EMPTY_PAGE_FIELDS).sort(), [
		"body",
		"date",
		"subtitle",
		"title",
	]);

	const [pagina] = poemPages(createDoc());

	for (const campo of ["title", "subtitle", "date", "body"]) {
		assert.equal(pagina[campo], "", `a pagina nova deveria ter ${campo} vazio`);
	}
});

test("adicionar pagina cria os quatro campos", () => {
	const [pagina] = poemPages(addPage(createDoc()));

	assert.deepEqual(Object.keys(pagina).sort(), [
		"body",
		"date",
		"id",
		"kind",
		"subtitle",
		"title",
	]);
});

test("setPoemField grava subtitulo e data da pagina", () => {
	const doc = createDoc();
	const [pagina] = poemPages(doc);

	const comSub = setPoemField(doc, pagina.id, "subtitle", "subtítulo");
	const comData = setPoemField(comSub, pagina.id, "date", "2026-11-19");

	assert.equal(poemPages(comData)[0].subtitle, "subtítulo");
	assert.equal(poemPages(comData)[0].date, "2026-11-19");
});

test("pageFieldsFrom normaliza campos ausentes ou invalidos", () => {
	assert.deepEqual(pageFieldsFrom({}), {
		title: "",
		subtitle: "",
		date: "",
		body: "",
	});

	assert.deepEqual(
		pageFieldsFrom({
			title: "Título",
			subtitle: "Subtítulo",
			date: "2026-02-30",
			body: "texto",
		}),
		{ title: "Título", subtitle: "Subtítulo", date: "", body: "texto" }
	);
});

test("pageFieldsFrom le rascunhos antigos com o campo poetry", () => {
	const campos = pageFieldsFrom({ title: "Antigo", poetry: "verso salvo" });

	assert.equal(campos.body, "verso salvo");
	assert.equal(campos.subtitle, "");
});

test("o rascunho persiste os quatro campos da pagina", () => {
	let draft = createDraft();
	const [pagina] = poemPages(draft.doc);

	draft = {
		...draft,
		doc: setPoemField(
			setPoemField(
				setPoemField(
					setPoemField(draft.doc, pagina.id, "title", "T"),
					pagina.id,
					"subtitle",
					"S"
				),
				pagina.id,
				"date",
				"2026-11-19"
			),
			pagina.id,
			"body",
			"texto"
		),
	};

	const lido = parseDraft(serializeDraft(draft));
	const [paginaLida] = poemPages(lido.doc);

	assert.equal(paginaLida.title, "T");
	assert.equal(paginaLida.subtitle, "S");
	assert.equal(paginaLida.date, "2026-11-19");
	assert.equal(paginaLida.body, "texto");
});

test("a interface da pagina expoe os quatro campos", () => {
	const card = ler("src/components/PoemCard/index.tsx");

	for (const campo of ["title", "subtitle", "date", "body"]) {
		assert.ok(
			card.includes(`onChange(id, "${campo}", e.target.value)`),
			`o card deveria editar ${campo}`
		);
	}
});

test("o PDF recebe os quatro campos de cada pagina", () => {
	const hook = ler("src/hooks/useZineEditor.ts");

	for (const campo of ["title", "subtitle", "date", "body"]) {
		assert.match(
			hook,
			new RegExp(`${campo}:`),
			`o hook deveria enviar ${campo} ao motor de PDF`
		);
	}
});
