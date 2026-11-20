import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";

const { layoutPanel } = await import("../src/lib/pdf/panel.ts");
const { wrapText } = await import("../src/lib/wrap-text.ts");
const {
	A4_CONTENT_WIDTH,
	PANEL_HEIGHT,
	POEM_BODY_SIZE,
	POEM_BODY_SIZE: BODY,
	POEM_DATE_SIZE,
	POEM_SUBTITLE_SIZE,
	POEM_TITLE_SIZE,
} = await import("../src/lib/pdf/layout.ts");

const pdfDoc = await PDFDocument.create();
const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

const fonts = { title: bold, subtitle: regular, date: regular, body: regular };

const cheia = {
	title: "Título da página",
	subtitle: "Subtítulo",
	date: "19/11/2026",
	body: "primeiro verso\nsegundo verso",
};

const vazia = { title: "", subtitle: "", date: "", body: "primeiro verso\nsegundo verso" };

const corpo = (pagina) => pagina.runs.filter((run) => run.role === "body");

test("as quatro paginas do modelo viram uma unica pagina quando tudo cabe", () => {
	const [pagina, ...resto] = layoutPanel(cheia, fonts);

	assert.equal(resto.length, 0);
	assert.deepEqual(
		pagina.runs.map((run) => run.role),
		["title", "subtitle", "date", "body", "body"]
	);
	assert.equal(pagina.header, true);
});

test("hierarquia tipografica fixa: titulo > subtitulo > data > corpo", () => {
	assert.ok(POEM_TITLE_SIZE > POEM_SUBTITLE_SIZE);
	assert.ok(POEM_SUBTITLE_SIZE > POEM_DATE_SIZE);
	assert.ok(POEM_DATE_SIZE > POEM_BODY_SIZE);

	const [pagina] = layoutPanel(cheia, fonts);
	const tamanho = Object.fromEntries(
		pagina.runs.map((run) => [run.role, run.size])
	);

	assert.equal(tamanho.title, POEM_TITLE_SIZE);
	assert.equal(tamanho.subtitle, POEM_SUBTITLE_SIZE);
	assert.equal(tamanho.date, POEM_DATE_SIZE);
	assert.equal(tamanho.body, BODY);
});

test("a ordem no PDF segue titulo, subtitulo, data e corpo", () => {
	const [pagina] = layoutPanel(cheia, fonts);
	const baselines = pagina.runs.map((run) => run.baseline);

	for (let i = 1; i < baselines.length; i += 1) {
		assert.ok(
			baselines[i] > baselines[i - 1],
			`linha ${i} deveria vir depois da anterior`
		);
	}
});

test("campo opcional vazio nao reserva espaco", () => {
	const [comCampos] = layoutPanel(cheia, fonts);
	const [semCampos] = layoutPanel(vazia, fonts);

	assert.equal(semCampos.header, false);
	assert.equal(semCampos.box.top, 0);
	assert.ok(
		semCampos.box.height > comCampos.box.height,
		"sem cabecalho a caixa do texto precisa ser maior"
	);
	assert.equal(semCampos.box.height, PANEL_HEIGHT);
	assert.equal(corpo(semCampos)[0].baseline, BODY);
});

test("cada campo opcional vazio devolve altura para a caixa", () => {
	const alturas = [
		layoutPanel(cheia, fonts)[0].box.height,
		layoutPanel({ ...cheia, title: "" }, fonts)[0].box.height,
		layoutPanel({ ...cheia, title: "", subtitle: "" }, fonts)[0].box.height,
		layoutPanel({ ...cheia, title: "", subtitle: "", date: "" }, fonts)[0].box.height,
	];

	for (let i = 1; i < alturas.length; i += 1) {
		assert.ok(
			alturas[i] > alturas[i - 1],
			`remover um campo deveria aumentar a caixa (${alturas})`
		);
	}
});

test("texto nunca ultrapassa a caixa em nenhuma pagina", () => {
	const verso = Array.from({ length: 200 }, (_, i) => `verso ${i + 1}`).join("\n");

	for (const pagina of layoutPanel({ ...cheia, body: verso }, fonts)) {
		for (const run of pagina.runs) {
			assert.ok(
				run.baseline <= PANEL_HEIGHT,
				`linha em ${run.baseline} passou da area de ${PANEL_HEIGHT}`
			);
		}
	}
});

test("texto maior que a caixa continua em pagina identificada, sem perder linha", () => {
	const verso = Array.from({ length: 200 }, (_, i) => `verso ${i + 1}`).join("\n");
	const paginas = layoutPanel({ ...cheia, body: verso }, fonts);

	assert.ok(paginas.length > 1, "esperava pagina de continuacao");

	const continuacoes = paginas.slice(1);
	for (const pagina of continuacoes) {
		assert.equal(pagina.runs[0].role, "label");
		assert.ok(pagina.runs[0].text.length > 0);
	}

	const lido = paginas
		.flatMap((pagina) => corpo(pagina))
		.map((run) => run.text);

	assert.deepEqual(lido, wrapText(verso, regular, BODY, A4_CONTENT_WIDTH));
});

test("area menor que uma linha nao trava a paginacao", () => {
	const paginas = layoutPanel({ ...cheia, body: "um\ndois\ntres" }, fonts, 10);

	assert.equal(paginas.length, 3);
	assert.deepEqual(
		paginas.map((pagina) => corpo(pagina).map((run) => run.text)),
		[["um"], ["dois"], ["tres"]]
	);
});
