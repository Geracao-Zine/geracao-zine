import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";

const { fitBody, measureBody } = await import("../src/lib/pdf/fit-body.ts");
const { layoutPanel } = await import("../src/lib/pdf/panel.ts");
const {
	A4_CONTENT_WIDTH,
	PANEL_HEIGHT,
	POEM_BODY_MAX_SIZE,
	POEM_BODY_MIN_SIZE,
	POEM_CONTINUATION_LABEL,
	POEM_DATE_SIZE,
	POEM_LINE_HEIGHT,
	POEM_BODY_SIZE,
	POEM_BLANK_LINE_HEIGHT,
	POEM_GAP_AFTER_HEADER,
} = await import("../src/lib/pdf/layout.ts");

const pdfDoc = await PDFDocument.create();
const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
const fonts = { title: bold, subtitle: regular, date: regular, body: regular };

const RATIO = POEM_LINE_HEIGHT / POEM_BODY_SIZE;

function request(text, height = PANEL_HEIGHT) {
	return {
		text,
		font: regular,
		width: A4_CONTENT_WIDTH,
		height,
		minSize: POEM_BODY_MIN_SIZE,
		maxSize: POEM_BODY_MAX_SIZE,
		lineHeightRatio: RATIO,
		blankLineRatio: POEM_BLANK_LINE_HEIGHT / POEM_LINE_HEIGHT,
	};
}

const verses = (count) => Array.from({ length: count }, (_, i) => `verso ${i + 1}`).join("\n");
const bodyRuns = (page) => page.runs.filter((run) => run.role === "body");

test("texto curto usa o corpo maximo", () => {
	const metrics = fitBody(request("um verso curto"));

	assert.equal(metrics.size, POEM_BODY_MAX_SIZE);
	assert.equal(metrics.fits, true);
});

test("o corpo nunca passa do teto que a hierarquia permite", () => {
	const metrics = fitBody(request("um verso curto"));

	assert.ok(metrics.size < POEM_DATE_SIZE, "o corpo precisa ficar abaixo da data");
});

test("texto longo reduz o corpo ate caber", () => {
	const curto = fitBody(request(verses(10)));
	const longo = fitBody(request(verses(60)));

	assert.equal(curto.size, POEM_BODY_MAX_SIZE);
	assert.ok(longo.size < curto.size, "texto longo deveria encolher");
	assert.equal(longo.fits, true);
	assert.ok(longo.size >= POEM_BODY_MIN_SIZE);
});

test("a bissecao devolve o maior corpo que ainda cabe", () => {
	const metrics = fitBody(request(verses(60)));
	const maior = measureBody(request(verses(60)), metrics.size);

	assert.equal(maior.fits, true);

	if (metrics.size < POEM_BODY_MAX_SIZE) {
		const seguinte = measureBody(request(verses(60)), metrics.size + 1);
		assert.equal(seguinte.fits, false, "um ponto acima ja deveria estourar a caixa");
	}
});

test("a entrelinha acompanha o corpo escolhido", () => {
	const metrics = fitBody(request(verses(60)));

	assert.equal(metrics.lineHeight, metrics.size * RATIO);
	assert.equal(metrics.blankLineHeight, metrics.lineHeight * 0.5);
});

test("quando nem o minimo cabe, o resultado sai marcado como estourado", () => {
	const metrics = fitBody(request(verses(400)));

	assert.equal(metrics.size, POEM_BODY_MIN_SIZE);
	assert.equal(metrics.fits, false);
});

test("faixa de corpo invalida falha alto", () => {
	assert.throws(() =>
		fitBody({ ...request("texto"), minSize: 10, maxSize: 8 })
	);
});

test("texto curto no painel recebe o corpo maximo e uma unica pagina", () => {
	const pages = layoutPanel(
		{ title: "Título", subtitle: "Subtítulo", date: "19/11/2026", body: "um verso" },
		fonts
	);

	assert.equal(pages.length, 1);
	assert.equal(pages[0].bodySize, POEM_BODY_MAX_SIZE);
	assert.equal(bodyRuns(pages[0])[0].size, POEM_BODY_MAX_SIZE);
});

test("texto longo continua numa unica pagina graças ao ajuste", () => {
	const pages = layoutPanel({ title: "", subtitle: "", date: "", body: verses(45) }, fonts);

	assert.equal(pages.length, 1, "o ajuste automatico deveria evitar a continuacao");
	assert.ok(pages[0].bodySize < POEM_BODY_MAX_SIZE);
});

test("nenhum texto ultrapassa a caixa em nenhuma pagina", () => {
	for (const count of [1, 20, 45, 80, 200, 500]) {
		for (const page of layoutPanel(
			{ title: "Título", subtitle: "Subtítulo", date: "19/11/2026", body: verses(count) },
			fonts
		)) {
			for (const run of page.runs) {
				assert.ok(
					run.baseline <= PANEL_HEIGHT,
					`linha em ${run.baseline} passou da area de ${PANEL_HEIGHT}`
				);
			}
		}
	}
});

test("nenhuma linha passa da largura da caixa", () => {
	const textos = [
		verses(20),
		"palavra ".repeat(200).trim(),
		"Supercalifragilisticexpialidocious".repeat(5),
		"ação coração linguiça".repeat(30),
	];

	for (const texto of textos) {
		for (const page of layoutPanel(
			{ title: "Título", subtitle: "", date: "", body: texto },
			fonts
		)) {
			for (const run of page.runs) {
				const largura = fonts.body.widthOfTextAtSize(run.text, run.size);
				assert.ok(
					largura <= A4_CONTENT_WIDTH + 0.001,
					`"${run.text}" mede ${largura} e passa da caixa`
				);
			}
		}
	}
});

test("caso extremo gera continuacao identificada, sem cortar linha", () => {
	const texto = verses(400);
	const pages = layoutPanel(
		{ title: "Título", subtitle: "", date: "", body: texto },
		fonts
	);

	assert.ok(pages.length > 1, "esperava pagina de continuacao");

	for (const page of pages) {
		assert.equal(page.bodySize, POEM_BODY_MIN_SIZE, "o corpo se mantem no minimo");
	}

	for (const page of pages.slice(1)) {
		assert.equal(page.runs[0].role, "label");
		assert.equal(page.runs[0].text, POEM_CONTINUATION_LABEL);
	}

	const lidas = pages.flatMap((page) => bodyRuns(page).map((run) => run.text));
	assert.equal(lidas.length, 400, "nenhuma linha pode sumir na continuacao");
	assert.deepEqual(
		lidas,
		Array.from({ length: 400 }, (_, i) => `verso ${i + 1}`)
	);
});

test("o corpo escolhido e o mesmo em todas as paginas do mesmo painel", () => {
	const pages = layoutPanel({ title: "", subtitle: "", date: "", body: verses(300) }, fonts);
	const tamanhos = new Set(pages.flatMap((page) => bodyRuns(page).map((run) => run.size)));

	assert.equal(tamanhos.size, 1, "paginas do mesmo painel nao podem variar o corpo");
});

test("a divisoria do cabecalho acompanha a caixa do texto", () => {
	const [comCabecalho] = layoutPanel(
		{ title: "Título", subtitle: "", date: "", body: "um verso" },
		fonts
	);
	const [semCabecalho] = layoutPanel(
		{ title: "", subtitle: "", date: "", body: "um verso" },
		fonts
	);

	assert.equal(comCabecalho.divider, comCabecalho.box.top - POEM_GAP_AFTER_HEADER / 2);
	assert.equal(semCabecalho.divider, null);
});
