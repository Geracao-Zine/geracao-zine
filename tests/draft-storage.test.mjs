import { test } from "node:test";
import assert from "node:assert/strict";

const {
	DRAFT_STORAGE_KEY,
	browserStorage,
	clearDraft,
	loadDraft,
	saveDraft,
} = await import("../src/lib/draft-storage.ts");

const { createDraft, parseDraft, poemPages, setPoemField } = await import(
	"../src/domain/index.ts"
);

function memoria() {
	const mapa = new Map();
	return {
		getItem: (chave) => (mapa.has(chave) ? mapa.get(chave) : null),
		setItem: (chave, valor) => mapa.set(chave, valor),
		removeItem: (chave) => mapa.delete(chave),
	};
}

test("sem armazenamento disponivel nada quebra", () => {
	assert.equal(browserStorage(), null);
	assert.equal(loadDraft(null), null);

	assert.doesNotThrow(() => saveDraft(null, createDraft()));
	assert.doesNotThrow(() => clearDraft(null));
});

test("salvar e carregar preserva o conteudo do rascunho", () => {
	const storage = memoria();
	const draft = createDraft();
	const poema = poemPages(draft.doc)[0];

	draft.cover.title = "Zine Salvo";
	draft.doc = setPoemField(draft.doc, poema.id, "poetry", "verso guardado");
	draft.step = "poems";

	saveDraft(storage, draft);
	const lido = loadDraft(storage);

	assert.ok(lido);
	assert.equal(lido.cover.title, "Zine Salvo");
	assert.equal(poemPages(lido.doc)[0].poetry, "verso guardado");
	assert.equal(lido.step, "poems");
});

test("a chave do rascunho e versionada por nome fixo", () => {
	const storage = memoria();

	saveDraft(storage, createDraft());

	assert.equal(DRAFT_STORAGE_KEY, "geracao-zine:draft");
	assert.ok(storage.getItem(DRAFT_STORAGE_KEY), "o rascunho deveria estar salvo");
});

test("um rascunho corrompido e tratado como inexistente", () => {
	const storage = memoria();
	storage.setItem(DRAFT_STORAGE_KEY, "{isso nao e json");

	assert.equal(loadDraft(storage), null);
});

test("limpar o rascunho remove o registro", () => {
	const storage = memoria();

	saveDraft(storage, createDraft());
	clearDraft(storage);

	assert.equal(storage.getItem(DRAFT_STORAGE_KEY), null);
	assert.equal(loadDraft(storage), null);
});

test("um armazenamento que lanca excecao nao derruba a edicao", () => {
	const quebrado = {
		getItem: () => {
			throw new Error("cota excedida");
		},
		setItem: () => {
			throw new Error("cota excedida");
		},
		removeItem: () => {
			throw new Error("cota excedida");
		},
	};

	assert.equal(loadDraft(quebrado), null);
	assert.doesNotThrow(() => saveDraft(quebrado, createDraft()));
	assert.doesNotThrow(() => clearDraft(quebrado));
});

test("o JSON salvo e legivel pelo parser do dominio", () => {
	const storage = memoria();
	const draft = createDraft();
	draft.cover.author = "Steve";

	saveDraft(storage, draft);

	const lido = parseDraft(storage.getItem(DRAFT_STORAGE_KEY));
	assert.ok(lido);
	assert.equal(lido.cover.author, "Steve");
	assert.equal(lido.doc.pages[0].kind, "cover");
});
