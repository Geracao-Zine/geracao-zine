import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";

const raiz = fileURLToPath(new URL("..", import.meta.url));

function ler(rel) {
	return readFileSync(join(raiz, rel), "utf8");
}

const {
	DEFAULT_MARKS,
	DEFAULT_SAFETY_MARGIN_MM,
	SAFETY_MARGIN_OPTIONS,
	createDraft,
	marksFrom,
	parseDraft,
	safetyMarginFrom,
	serializeDraft,
} = await import("../src/domain/index.ts");

const { TEMPLATES, panelSize } = await import("../src/lib/pdf/templates.ts");
const { markLines } = await import("../src/lib/pdf/marks.ts");
const { layoutPanel } = await import("../src/lib/pdf/panel.ts");
const { A4_CONTENT_WIDTH, PANEL_HEIGHT } = await import("../src/lib/pdf/layout.ts");
const { drawMarks } = await import("../src/lib/pdf/zine.ts");

test("marcas e margem nascem ligadas, com opcoes discretas", () => {
	assert.equal(DEFAULT_MARKS, true);
	assert.equal(DEFAULT_SAFETY_MARGIN_MM, 5);
	assert.deepEqual([...SAFETY_MARGIN_OPTIONS], [0, 3, 5, 8, 10]);

	const rascunho = createDraft();

	assert.equal(rascunho.marks, true);
	assert.equal(rascunho.safetyMargin, 5);
});

test("rascunho antigo, sem os campos, cai nos padroes", () => {
	const antigo = JSON.parse(serializeDraft(createDraft()));
	delete antigo.marks;
	delete antigo.safetyMargin;

	const voltou = parseDraft(JSON.stringify(antigo));

	assert.equal(voltou.marks, true);
	assert.equal(voltou.safetyMargin, 5);
});

test("marcas e margem sobrevivem ao salvar e ler", () => {
	const rascunho = { ...createDraft(), marks: false, safetyMargin: 8 };
	const voltou = parseDraft(serializeDraft(rascunho));

	assert.equal(voltou.marks, false);
	assert.equal(voltou.safetyMargin, 8);
});

test("marcas so aceitam booleano de verdade", () => {
	assert.equal(marksFrom(false), false);
	assert.equal(marksFrom(true), true);

	for (const invalido of [undefined, null, "false", 0, 1, {}, []]) {
		assert.equal(marksFrom(invalido), true, `valor ${String(invalido)}`);
	}
});

test("a margem e aproximada da opcao mais proxima e fica na faixa", () => {
	assert.equal(safetyMarginFrom(7), 8);
	assert.equal(safetyMarginFrom(2), 3);
	assert.equal(safetyMarginFrom(-5), 0);
	assert.equal(safetyMarginFrom(99), 10);

	for (const invalido of [undefined, null, "8", NaN, Infinity, {}, []]) {
		assert.equal(safetyMarginFrom(invalido), DEFAULT_SAFETY_MARGIN_MM);
	}
});

test("cada template declara um plano de dobras e cortes coerente", () => {
	for (const template of Object.values(TEMPLATES)) {
		const { markPlan } = template;
		const lines = markLines(template);
		const verticais = lines.filter((line) => line.axis === "vertical");
		const horizontais = lines.filter((line) => line.axis === "horizontal");

		assert.equal(
			verticais.length,
			markPlan.foldColumns.length + markPlan.cutColumns.length,
			`${template.id}: linhas verticais`
		);
		assert.equal(
			horizontais.length,
			markPlan.foldRows.length + markPlan.cutRows.length,
			`${template.id}: linhas horizontais`
		);

		for (const line of lines) {
			const limite = line.axis === "vertical" ? template.sheet.width : template.sheet.height;

			assert.ok(line.at > 0, `${template.id}: marca na borda`);
			assert.ok(line.at < limite, `${template.id}: marca fora da folha`);
		}
	}
});

test("a dobra cai no meio da folga entre dois paineis", () => {
	const template = TEMPLATES["duas-colunas-vertical"];
	const [esquerda, direita] = template.slots;
	const [linha] = markLines(template);

	assert.equal(linha.axis, "vertical");
	assert.equal(linha.kind, "fold");
	assert.ok(Math.abs(linha.at - (esquerda.x + esquerda.width + template.gutter / 2)) < 1e-9);
	assert.ok(Math.abs(linha.at - (direita.x - template.gutter / 2)) < 1e-9);
});

test("gatefold dobra nas portas e minizine corta no centro", () => {
	const gatefold = markLines(TEMPLATES.gatefold).filter((line) => line.axis === "vertical");
	const centroGatefold = TEMPLATES.gatefold.sheet.width / 2;

	assert.equal(gatefold.length, 2);
	assert.ok(
		gatefold.every((line) => Math.abs(line.at - centroGatefold) > 1),
		"o centro do gatefold e o encontro das portas, nao uma dobra"
	);

	const minizine = markLines(TEMPLATES["mini-zine"]).filter((line) => line.axis === "vertical");
	const corte = minizine.find((line) => line.kind === "cut");

	assert.ok(corte, "o minizine precisa de um corte central");
	assert.ok(
		Math.abs(corte.at - TEMPLATES["mini-zine"].sheet.width / 2) < 1,
		"o corte do minizine cai no centro da folha"
	);
	assert.ok(
		minizine.filter((line) => line.kind === "fold").length === 2,
		"o minizine dobra nas duas laterais"
	);
});

test("o desenho usa tracejado na dobra e linha continua no corte", () => {
	const chamadas = [];
	const page = {
		drawLine: (options) => chamadas.push(options),
	};
	const rgb = (r, g, b) => ({ r, g, b });
	const template = TEMPLATES["mini-zine"];

	drawMarks(page, template, rgb);

	const verticais = chamadas.filter(
		(chamada) => chamada.start.x === chamada.end.x && chamada.start.y !== chamada.end.y
	);
	const tracejadas = verticais.filter((chamada) => Array.isArray(chamada.dashArray));
	const continuas = verticais.filter((chamada) => !chamada.dashArray);
	const centro = template.sheet.width / 2;

	assert.ok(tracejadas.length >= 4, "as duas dobras aparecem dos dois lados da folha");
	assert.ok(
		continuas.some((chamada) => Math.abs(chamada.start.x - centro) < 1),
		"o corte central sai continuo"
	);
	assert.ok(
		tracejadas.every((chamada) => Math.abs(chamada.start.x - centro) > 1),
		"a dobra nunca vira corte"
	);
});

test("a margem de seguranca encolhe a caixa de texto do painel", async () => {
	const pdfDoc = await PDFDocument.create();
	const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fonts = { title: fonte, subtitle: fonte, date: fonte, body: fonte };
	const poema = {
		title: "Titulo",
		subtitle: "Subtitulo",
		date: "19/11/2026",
		body: "primeira linha\nsegunda linha",
	};

	const semMargem = layoutPanel(poema, fonts, PANEL_HEIGHT, A4_CONTENT_WIDTH, 0)[0];
	const comMargem = layoutPanel(poema, fonts, PANEL_HEIGHT, A4_CONTENT_WIDTH, 40)[0];

	assert.equal(semMargem.inset, 0);
	assert.equal(comMargem.inset, 40);
	assert.ok(Math.abs(semMargem.box.height - comMargem.box.height - 80) < 1e-9);
	assert.ok(
		comMargem.runs.every((run) => run.baseline <= PANEL_HEIGHT - 80),
		"nenhuma linha entra na faixa da margem"
	);
});

test("a margem vale para o painel de todos os templates", async () => {
	const pdfDoc = await PDFDocument.create();
	const fonte = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const fonts = { title: fonte, subtitle: fonte, date: fonte, body: fonte };
	const inset = 20;
	const poema = {
		title: "Titulo",
		subtitle: "Subtitulo",
		date: "19/11/2026",
		body: "uma linha curta",
	};

	for (const template of Object.values(TEMPLATES)) {
		const { width, height } = panelSize(template);
		const [page] = layoutPanel(poema, fonts, height, width, inset);
		const limiteY = height - inset * 2 + 1e-6;
		const limiteX = width - inset * 2 + 0.01;

		assert.equal(page.inset, inset, `${template.id}: inset`);
		assert.ok(page.box.height <= limiteY, `${template.id}: caixa alta demais`);

		for (const run of page.runs) {
			assert.ok(run.baseline <= limiteY, `${template.id}: linha abaixo da margem`);
			assert.ok(
				fonte.widthOfTextAtSize(run.text, run.size) <= limiteX,
				`${template.id}: linha mais larga que a margem`
			);
		}
	}
});

test("a etapa de impressao oferece marcas e margem, e o PDF recebe as duas", () => {
	const printStep = ler("src/components/ZineWizard/steps/PrintStep.tsx");
	const hook = ler("src/hooks/useZineEditor.ts");
	const zine = ler("src/lib/pdf/zine.ts");
	const review = ler("src/components/ZineWizard/steps/ReviewStep.tsx");

	assert.match(printStep, /Marcas de corte e dobra/);
	assert.match(printStep, /SAFETY_MARGIN_OPTIONS/);
	assert.match(printStep, /onMarksChange/);
	assert.match(hook, /marks: draft\.marks/);
	assert.match(hook, /safetyMarginMm: draft\.safetyMargin/);
	assert.match(zine, /drawMarks/);
	assert.match(zine, /mmToPt\(input\.safetyMarginMm/);
	assert.match(review, /safetyMargin=\{safetyMargin\}/);
});
