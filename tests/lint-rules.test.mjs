import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";

const raiz = new URL("../", import.meta.url).pathname;
const exec = promisify(execFile);
const eslint = join(raiz, "node_modules/.bin/eslint");

// src/generated e saida do `prisma generate` (versionada no .gitignore, nao no
// repo). Auditar codigo de terceiros gerado so produz ruido: ele nao segue as
// regras do projeto e nao pode ser corrigido a mao.
const IGNORADOS = new Set(["generated"]);

async function fontes(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  const achados = [];
  for (const e of entradas) {
    if (e.isDirectory() && IGNORADOS.has(e.name)) continue;
    const caminho = join(dir, e.name);
    if (e.isDirectory()) achados.push(...(await fontes(caminho)));
    else if (/\.(ts|tsx)$/.test(e.name)) achados.push(caminho);
  }
  return achados;
}

test("nenhum any explicito em src", async () => {
  const comAny = [];
  for (const arquivo of await fontes(join(raiz, "src"))) {
    if (/:\s*any\b|\bas\s+any\b|<any>|any\[\]/.test(await readFile(arquivo, "utf8"))) {
      comAny.push(arquivo.replace(raiz, ""));
    }
  }
  assert.deepEqual(comAny, []);
});

test("as regras de any e ponto e virgula estao ativas como erro", async () => {
  const { stdout } = await exec(eslint, [
    "--print-config",
    "src/lib/pdf/reading.ts",
  ], { cwd: raiz });
  const regras = JSON.parse(stdout).rules;
  assert.deepEqual(regras["@typescript-eslint/no-explicit-any"], [2]);
  assert.deepEqual(regras.semi, [2, "always"]);
});

test("a configuracao nao desliga as regras com off", async () => {
  const config = await readFile(join(raiz, "eslint.config.mjs"), "utf8");
  assert.doesNotMatch(config, /no-explicit-any"?\s*:\s*["']off["']/);
  assert.doesNotMatch(config, /semi"?\s*:\s*["']off["']/);
});
