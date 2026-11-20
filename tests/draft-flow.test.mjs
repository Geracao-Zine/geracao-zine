import { test } from "node:test";
import assert from "node:assert/strict";

const {
	STEPS,
	createDraft,
	draftIssues,
	isDraftDiagrammable,
	parseDraft,
	serializeDraft,
	stepIndex,
	stepStatus,
	canEnterStep,
	addPage,
	setPoemField,
	poemPages,
	movePage,
} = await import("../src/domain/index.ts");

function draftCom(cover = {}, poems = []) {
	const base = createDraft();
	let doc = base.doc;

	poemPages(doc).forEach((poem) => {
		doc = setPoemField(doc, poem.id, "body", "");
	});

	poems.forEach((poem, index) => {
		if (index > 0) {
			doc = addPage(doc);
		}
		const target = poemPages(doc)[index];
		if (poem.title !== undefined) doc = setPoemField(doc, target.id, "title", poem.title);
                if (poem.subtitle !== undefined) doc = setPoemField(doc, target.id, "subtitle", poem.subtitle);
                if (poem.date !== undefined) doc = setPoemField(doc, target.id, "date", poem.date);
		if (poem.body !== undefined) doc = setPoemField(doc, target.id, "body", poem.body);
	});

	return {
		...base,
		cover: { ...base.cover, ...cover },
		doc,
	};
}

const capa = { title: "Zine", author: "Steve" };

test("o fluxo tem as quatro etapas na ordem do produto", () => {
	assert.deepEqual(
		STEPS.map((step) => step.id),
		["cover", "poems", "review", "print"]
	);
	assert.equal(stepIndex("cover"), 0);
	assert.equal(stepIndex("print"), 3);
});

test("o rascunho sobrevive a serializacao e leitura", () => {
	const original = draftCom(capa, [{ title: "Primeiro", body: "texto\ncom quebra" }]);
	original.step = "review";
	original.format = "banner-a4";

	const restored = parseDraft(serializeDraft(original));

	assert.ok(restored);
	assert.equal(restored.step, "review");
	assert.equal(restored.format, "banner-a4");
	assert.equal(restored.cover.title, "Zine");
	assert.equal(restored.cover.author, "Steve");
	assert.equal(restored.doc.pages.length, original.doc.pages.length);

	const poem = poemPages(restored.doc)[0];
	assert.equal(poem.title, "Primeiro");
	assert.equal(poem.body, "texto\ncom quebra");
});

test("parseDraft descarta entrada invalida sem quebrar", () => {
	assert.equal(parseDraft(null), null);
	assert.equal(parseDraft(""), null);
	assert.equal(parseDraft("{nao e json"), null);
	assert.equal(parseDraft("42"), null);
});

test("parseDraft cai no padrao quando os campos vem corrompidos", () => {
	const draft = parseDraft(
		JSON.stringify({
			step: "inexistente",
			format: "formato-antigo",
			cover: { title: 7, author: null, titleFont: "fonte-que-nao-existe" },
			doc: { pages: "nao e lista" },
		})
	);

	assert.ok(draft);
	assert.equal(draft.step, "cover");
	assert.equal(draft.format, "banner-a4");
	assert.equal(draft.cover.title, "");
	assert.equal(draft.cover.author, "");
	assert.equal(draft.cover.titleFont, "geistSans");
	assert.equal(draft.doc.pages[0].kind, "cover");
	assert.equal(poemPages(draft.doc).length, 1);
});

test("parseDraft aceita o formato antigo como banner A4", () => {
        const draft = parseDraft(JSON.stringify({ format: "reading" }));

        assert.ok(draft);
        assert.equal(draft.format, "banner-a4");
});

test("parseDraft sempre repoe a capa e remove ids duplicados", () => {
	const draft = parseDraft(
		JSON.stringify({
			doc: {
				pages: [
					{ id: "page-1", kind: "poem", title: "A", body: "um" },
					{ id: "page-1", kind: "poem", title: "B", body: "dois" },
				],
			},
		})
	);

	assert.ok(draft);
	assert.equal(draft.doc.pages[0].kind, "cover");
	assert.equal(poemPages(draft.doc).length, 1);
	assert.equal(poemPages(draft.doc)[0].title, "A");
});

test("parseDraft nao reaproveita ids ao adicionar depois de restaurar", () => {
	const draft = parseDraft(
		JSON.stringify({
			doc: { pages: [{ id: "page-7", kind: "poem", title: "", body: "x" }] },
		})
	);

	assert.ok(draft);

	const depois = addPage(draft.doc);
	const ids = depois.pages.map((page) => page.id);

	assert.equal(new Set(ids).size, ids.length);
	assert.ok(ids.includes("page-8"), `esperava page-8 em ${ids.join(", ")}`);
});

test("pendencias listam poesias sem titulo e paginas vazias", () => {
	const draft = draftCom(capa, [
		{ title: "", body: "texto" },
		{ title: "", body: "" },
	]);

	const mensagens = draftIssues(draft).map((issue) => issue.message);

	assert.ok(mensagens.includes("2 poesias sem título"), mensagens.join(" | "));
	assert.ok(mensagens.includes("1 página vazia"), mensagens.join(" | "));
});

test("as pendencias usam singular quando ha apenas um caso", () => {
	const draft = draftCom(capa, [{ title: "", body: "texto" }]);
	const mensagens = draftIssues(draft).map((issue) => issue.message);

	assert.ok(mensagens.includes("1 poesia sem título"), mensagens.join(" | "));
	assert.ok(!mensagens.includes("1 página vazia"), mensagens.join(" | "));
});

test("capa incompleta aparece como pendencia de erro", () => {
	const draft = draftCom({}, [{ title: "T", body: "texto" }]);
	const issues = draftIssues(draft);

	const titulo = issues.find((issue) => issue.id === "cover-title");
	const autor = issues.find((issue) => issue.id === "cover-author");

	assert.equal(titulo?.severity, "error");
	assert.equal(autor?.severity, "error");
});

test("o rascunho sem texto nenhum nao esta pronto para diagramar", () => {
	const vazio = draftCom(capa, [{ title: "T", body: "   " }]);
	assert.equal(isDraftDiagrammable(vazio), false);
	assert.equal(canEnterStep(vazio, "print"), false);
});

test("capa completa e uma poesia com texto liberam a dobra", () => {
	const pronto = draftCom(capa, [{ title: "", body: "um verso" }]);

	assert.equal(isDraftDiagrammable(pronto), true);
	assert.equal(canEnterStep(pronto, "print"), true);
	assert.equal(canEnterStep(pronto, "review"), true);
});

test("a etapa de dobra fica bloqueada ate o conteudo minimo", () => {
	const incompleto = draftCom({ title: "Zine" }, [{ title: "T", body: "x" }]);

	assert.equal(stepStatus(incompleto, "print"), "blocked");
	assert.equal(stepStatus(incompleto, "cover"), "blocked");
	assert.equal(stepStatus(draftCom(capa, [{ title: "", body: "x" }]), "poems"), "pending");
	assert.equal(stepStatus(draftCom(capa, [{ title: "T", body: "x" }]), "poems"), "done");
});

test("reordenar troca poemas de lugar sem tocar na capa", () => {
	let doc = createDraft().doc;
	doc = addPage(addPage(doc));

	const poems = poemPages(doc);
	doc = setPoemField(doc, poems[0].id, "body", "primeiro");
	doc = setPoemField(doc, poems[1].id, "body", "segundo");
	doc = setPoemField(doc, poems[2].id, "body", "terceiro");

	const movido = movePage(doc, poems[2].id, -1);
	const ordem = poemPages(movido).map((poem) => poem.body);

	assert.deepEqual(ordem, ["primeiro", "terceiro", "segundo"]);
	assert.equal(movido.pages[0].kind, "cover");
});

test("reordenar nas bordas ou com id desconhecido nao altera nada", () => {
	const doc = addPage(createDraft().doc);
	const poems = poemPages(doc);

	assert.equal(movePage(doc, poems[0].id, -1), doc);
	assert.equal(movePage(doc, poems[1].id, 1), doc);
	assert.equal(movePage(doc, "nao-existe", 1), doc);
});
