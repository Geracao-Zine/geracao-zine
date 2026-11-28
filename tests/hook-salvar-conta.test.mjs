import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

function ler(rel) {
	return readFileSync(join(raiz, rel), "utf8");
}

const editor = ler("src/hooks/useZineEditor.ts");
const hook = ler("src/hooks/useSalvarNaConta.ts");
const botao = ler("src/components/SalvarNaConta/index.tsx");
const wizard = ler("src/components/ZineWizard/index.tsx");

test("o rascunho local continua sendo gravado pelo editor", () => {
	assert.match(editor, /saveDraft\(/, "sem isso o rascunho de quem nao entrou se perde");
	assert.match(editor, /loadDraft\(/, "o rascunho precisa voltar ao abrir");
});

test("a gravacao local passa pelo debounce, nao a cada tecla", () => {
	assert.match(editor, /localAgendado\.current\?\.agendar\(draft\)/);
	assert.match(editor, /debounce<\[ZineDraft\]>/);
});

test("o pendente local e liberado ao sair ou esconder a aba", () => {
	assert.match(editor, /addEventListener\("pagehide", liberar\)/);
	assert.match(editor, /addEventListener\("visibilitychange", aoEsconder\)/);
	assert.match(editor, /visibilityState === "hidden"/);
});

test("o editor so espelha na conta depois de ler o rascunho do navegador", () => {
	// `ready` e a garantia de que o estado inicial vazio nao sobrescreve o
	// zine ja salvo na conta.
	assert.match(editor, /useSalvarNaConta\(draft, sessao\.status === "autenticado", ready\)/);
});

test("comecar um zine novo desvincula o zine da conta", () => {
	assert.match(editor, /conta\.desvincular\(\)/);
	assert.match(hook, /idRef\.current = null/, "sem isso o zine novo sobrescreve o anterior");
	assert.match(hook, /ultimoSalvo\.current = null/);
});

test("o hook cria uma vez e depois atualiza o mesmo zine", () => {
	assert.match(hook, /criarZineNaConta/, "o primeiro salvamento cria");
	assert.match(hook, /atualizarZineNaConta/, "os seguintes atualizam");
	assert.match(hook, /idRef\.current/, "o id precisa sobreviver entre salvamentos");
});

test("o hook grava ao desmontar em vez de perder o pendente", () => {
	assert.match(hook, /agendado\.current\?\.liberar\(\)/);
	assert.match(hook, /addEventListener\("pagehide"/);
});

test("o botao existe e so aparece habilitado com titulo", () => {
	assert.match(botao, /Salvar na conta/);
	assert.match(botao, /disabled=\{salvando \|\| !conta\.podeSalvar\}/);
});

test("o estado do salvamento e anunciado para leitores de tela", () => {
	assert.match(botao, /role="status"/);
	assert.match(botao, /aria-live="polite"/);
});

test("quem nao entrou recebe explicacao, nao um botao quebrado", () => {
	assert.match(botao, /if \(!autenticado\)/);
	assert.match(botao, /salvo neste navegador/);
});

test("o assistente mostra a barra da conta", () => {
	assert.match(wizard, /<SalvarNaContaBotao conta=\{editor\.conta\}/);
	assert.match(wizard, /const autenticado = sessao\.status === "autenticado"/);
});

test("o editor divulga e priva pelo interruptor, sem tocar no conteudo", () => {
        assert.match(botao, /data-testid="interruptor-visibilidade"/);
        assert.match(botao, /conta\.definirVisibilidade\(publico \? "private" : "public"\)/);
        assert.match(hook, /definirVisibilidade as alterarVisibilidade/);
});

test("divulgar pede confirmacao antes de sair do privado", () => {
        // Publicar tem link publico e nao desfaz o que ja foi visto; privar, sim,
        // e seguro. Por isso so a ida para `public` pergunta.
        assert.match(botao, /if \(\s*!publico &&\s*!window\.confirm\(/);
        assert.match(botao, /biblioteca publica/);
});

test("sem zine na conta o interruptor nao aparece", () => {
        assert.match(botao, /conta\.visibility === null \? null :/);
});

test("divulgar exige que o conteudo ja esteja na conta", () => {
        assert.match(hook, /if \(!id\) \{\s*setErro\("Salve o zine na conta antes de divulgar\."\)/);
});

test("abrir um zine da conta assume a visibilidade que ele ja tinha", () => {
        assert.match(editor, /conta\.adotar\(resultado\.zine\.id, aberto, resultado\.zine\.visibility\)/);
});
