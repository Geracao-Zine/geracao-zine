import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const raiz = fileURLToPath(new URL("..", import.meta.url));

function ler(rel) {
	return readFileSync(join(raiz, rel), "utf8");
}

function arquivosTsx(dir) {
	const achados = [];
	for (const entrada of readdirSync(dir)) {
		const caminho = join(dir, entrada);
		if (statSync(caminho).isDirectory()) achados.push(...arquivosTsx(caminho));
		else if (caminho.endsWith(".tsx")) achados.push(caminho);
	}
	return achados;
}

const layout = ler("src/app/layout.tsx");
const globals = ler("src/app/globals.css");

test("layout espaça o conteudo pela altura real da navbar", () => {
	assert.match(layout, /pt-\[var\(--navbar-height\)\]/);
});

test("layout nao usa mais altura fixa mt-14", () => {
	assert.ok(
		!layout.includes("mt-14"),
		"mt-14 voltou: a altura fixa nao acompanha a navbar medida",
	);
});

test("a altura da navbar tem fallback em CSS", () => {
	assert.match(
		globals,
		/--navbar-height:\s*[\d.]+rem/,
		"sem fallback o conteudo salta antes do efeito do Navbar medir",
	);
});

test("o body usa a fonte Geist carregada pelo next/font", () => {
	assert.match(globals, /font-family:\s*var\(--font-geist-sans\)/);
});

test("o body nao forca Arial", () => {
	assert.ok(
		!/font-family:\s*Arial/.test(globals),
		"Arial anula a Geist carregada via next/font",
	);
});

test("o body mantem fallback sans-serif", () => {
	const bloco = globals.match(/body\s*\{[^}]*\}/);
	assert.ok(bloco, "bloco body nao encontrado");
	assert.match(bloco[0], /sans-serif/);
});

test("nenhuma pagina soma o offset da navbar por conta propria", () => {
	const paginas = arquivosTsx(join(raiz, "src/app")).filter(
		(caminho) => !caminho.endsWith("layout.tsx"),
	);
	const culpadas = paginas.filter((caminho) =>
		readFileSync(caminho, "utf8").includes("pt-[var(--navbar-height)]"),
	);
	assert.deepEqual(
		culpadas.map((caminho) => caminho.slice(raiz.length)),
		[],
		"offset duplicado: o layout ja reserva a altura da navbar",
	);
});

test("a navbar remede a altura quando ela muda depois do mount", () => {
	const navbar = ler("src/components/Navbar/index.tsx");
	assert.match(
		navbar,
		/ResizeObserver/,
		"sem observador, zoom ou fonte maior congelam --navbar-height e o conteudo fica encoberto",
	);
	assert.match(navbar, /observador\.observe\(/);
	assert.match(navbar, /observador\.disconnect\(\)/);
});

test("as paginas de conteudo descontam a navbar do min-h", () => {
	const paginas = [
		"src/app/page.tsx",
		"src/app/Library/page.tsx",
		"src/app/Support/page.tsx",
		"src/components/ZineWizard/index.tsx",
	];
	for (const pagina of paginas) {
		const fonte = ler(pagina);
		assert.ok(
			!fonte.includes("min-h-screen"),
			`${pagina}: min-h-screen somado ao padding gera rolagem fantasma`,
		);
		assert.match(
			fonte,
			/min-h-\[calc\(100vh-var\(--navbar-height\)\)\]/,
			`${pagina}: min-h deve descontar a navbar`,
		);
	}
});
