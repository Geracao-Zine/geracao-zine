import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

function ler(rel) {
	return readFileSync(join(raiz, rel), "utf8");
}

const menu = ler("src/components/LibraryNav/index.tsx");
const pagina = ler("src/app/Library/page.tsx");

test("as tres secoes aparecem com icone e titulo", () => {
	for (const rotulo of ["Biblioteca", "Meus zines", "Favoritos"]) {
		assert.match(menu, new RegExp(`rotulo: "${rotulo}"`), `falta a aba ${rotulo}`);
	}

	// O icone e o titulo ficam lado a lado no markup: sem isso a barra deixa de
	// seguir o padrao de aplicativo movel (icone em cima, texto embaixo).
	assert.match(menu, /<Icone aria-hidden/);
	assert.match(menu, /<span[^>]*>\s*\{item\.rotulo\}/);
	assert.match(menu, /flex-col/, "no celular o icone precisa ficar acima do titulo");
});

test("o menu gruda no rodape no celular e sai do caminho no desktop", () => {
	assert.match(menu, /fixed inset-x-0 bottom-0/, "barra fixa no rodape e o padrao movel");
	assert.match(menu, /md:static/, "em tela larga uma barra flutuante so cobre conteudo");
	assert.match(
		menu,
		/env\(safe-area-inset-bottom\)/,
		"sem isso a barra encosta na area de gestos do iPhone"
	);
});

test("a pagina reserva espaco para a barra fixa", () => {
	assert.match(
		pagina,
		/pb-32 md:pb-20/,
		"sem pb extra a barra fixa cobre o ultimo card no celular"
	);
	assert.match(
		pagina,
		/<LibraryNav aba=\{aba\} onSelect=\{setAba\} \/>/,
		"a pagina precisa usar o menu, nao botoes soltos"
	);
});

test("o menu mantem os papeis de acessibilidade das abas", () => {
	assert.match(menu, /role="tablist"/);
	assert.match(menu, /role="tab"/);
	assert.match(menu, /aria-selected=\{ativa\}/);
	assert.match(menu, /aria-label="Secoes da biblioteca"/);
});

test("o menu nao depende de biblioteca de icones nova", () => {
	// react-icons ja e dependencia (a Navbar usa). Instalar outro pacote so para
	// tres icones engordaria o bundle sem necessidade.
	assert.match(menu, /from "react-icons\/hi2"/);
});

test("os rotulos das abas tem contraste suficiente nos dois temas", () => {
// Texto de 11px com --purple-dark sobre o fundo escuro da 2.0:1, ilegivel.
function linear(c) {
const v = c / 255;
return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminancia(hex) {
const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contraste(a, b) {
const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
return (claro + 0.05) / (escuro + 0.05);
}

const claro = { fundo: "#F2EDE9", texto: "#63268C" };
const escuro = { fundo: "#0D0D0D", texto: "#C084FC" };

assert.ok(contraste(claro.texto, claro.fundo) >= 4.5, "tema claro abaixo de 4.5:1");
assert.ok(contraste(escuro.texto, escuro.fundo) >= 4.5, "tema escuro abaixo de 4.5:1");

// E o componente precisa usar os tokens conferidos acima.
assert.match(menu, /dark:text-\[var\(--purple-light\)\]/);
const css = ler("src/app/globals.css");
assert.match(css, /--purple-light: #C084FC;/);
});
