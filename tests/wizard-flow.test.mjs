import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

function ler(rel) {
	return readFileSync(join(raiz, rel), "utf8");
}

function arquivosTsx(dir) {
	const absoluto = join(raiz, dir);
	return readdirSync(absoluto).flatMap((entrada) => {
		const relativo = join(dir, entrada);
		return statSync(join(raiz, relativo)).isDirectory()
			? arquivosTsx(relativo)
			: relativo.endsWith(".tsx")
				? [relativo]
				: [];
	});
}

const hook = ler("src/hooks/useZineEditor.ts");
const wizard = ler("src/components/ZineWizard/index.tsx");

test("o hook persiste o rascunho e le o que foi salvo", () => {
	assert.match(hook, /saveDraft\(/, "o hook deve salvar o rascunho");
	assert.match(hook, /loadDraft\(/, "o hook deve restaurar o rascunho ao montar");
});

test("o rascunho salvo vence a semente vinda da URL", () => {
	assert.match(
		hook,
		/if \(stored\) \{\s*setDraft\(stored\);/,
		"recarregar nao pode voltar ao formulario vazio nem ao seed da URL"
	);
});

test("navegar entre etapas nao descarta o documento", () => {
	assert.match(hook, /\.\.\.current, step:/, "a troca de etapa deve preservar o resto do rascunho");
	assert.match(hook, /\.\.\.current, doc:/, "a edicao de poema deve preservar a etapa e a capa");
});

test("o status das etapas vem do dominio, sem regra duplicada no hook", () => {
	assert.match(
		hook,
		/import \{[^}]*stepStatus[^}]*\} from "@\/domain"/,
		"o hook deve importar stepStatus do dominio"
	);
	assert.match(hook, /statusOf = \(step: ZineStep\): StepStatus => stepStatus\(draft, step\)/);
});

test("remover poesia pede confirmacao no wizard", () => {
	assert.match(
		wizard,
		/if \(window\.confirm\([\s\S]*?\)\) \{\s*editor\.removePoem\(id\);/,
		"a remocao so pode acontecer depois da confirmacao"
	);
});

test("comecar um novo zine tambem confirma antes de apagar", () => {
	assert.match(
		wizard,
		/if \(window\.confirm\([\s\S]*?\)\) \{\s*editor\.reset\(\);/,
		"apagar o rascunho inteiro exige confirmacao"
	);
});

test("reordenar poesias chega ao hook em ambas as direcoes", () => {
	assert.match(wizard, /onMove=\{editor\.movePoem\}/);
	assert.match(wizard, /onRemove=\{askRemove\}/);
});

test("a etapa de dobra so abre com conteudo minimo", () => {
	assert.match(hook, /canOpen/, "o wizard precisa saber se a etapa esta liberada");
	assert.match(wizard, /disabled=\{last \|\| !editor\.canOpen/);
	assert.match(ler("src/components/ZineWizard/steps/PrintStep.tsx"), /disabled=\{!diagrammable\}/);
});

test("as quatro etapas estao ligadas ao wizard", () => {
	for (const etapa of ["CoverStep", "PoemsStep", "ReviewStep", "PrintStep"]) {
		assert.ok(wizard.includes(etapa), `${etapa} deveria estar ligado ao wizard`);
	}
});

test("as rotas continuam delegando ao wizard e sem gerar PDF", () => {
	for (const rota of ["src/app/Create/page.tsx", "src/app/Editor/page.tsx"]) {
		const fonte = ler(rota);
		assert.ok(fonte.includes("ZineWizard"), `${rota} deve usar o wizard`);
		assert.ok(!/lib\/pdf/.test(fonte), `${rota} nao pode gerar PDF`);
	}
});

test("nenhum componente de tela persiste o rascunho por conta propria", () => {
	for (const caminho of arquivosTsx("src/components")) {
		const fonte = ler(caminho);
		assert.ok(
			!fonte.includes("localStorage"),
			`${caminho} deveria delegar a persistencia ao hook`
		);
	}
});

test("o README descreve o fluxo em etapas", () => {
	const readme = ler("README.md");
	for (const etapa of ["Capa e autoria", "Poesias", "Revisão", "Dobra e impressão"]) {
		assert.ok(readme.includes(etapa), `README: falta a etapa ${etapa}`);
	}
});
