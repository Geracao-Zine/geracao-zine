import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

const raiz = new URL("../", import.meta.url).pathname;

async function arquivosFonte(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  const achados = [];
  for (const e of entradas) {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) achados.push(...(await arquivosFonte(caminho)));
    else if (/\.(ts|tsx|mts)$/.test(e.name)) achados.push(caminho);
  }
  return achados;
}

test("jspdf nao esta nas dependencias", async () => {
  const pkg = JSON.parse(await readFile(join(raiz, "package.json"), "utf8"));
  const todas = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.equal(todas.jspdf, undefined);
});

test("jspdf nao e importado em src", async () => {
  const arquivos = await arquivosFonte(join(raiz, "src"));
  const comJspdf = [];
  for (const f of arquivos) {
    if (/from\s+["']jspdf["']|require\(\s*["']jspdf["']\s*\)/.test(await readFile(f, "utf8"))) {
      comJspdf.push(f);
    }
  }
  assert.deepEqual(comJspdf, []);
});
