import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const ler = (nome) => readFile(new URL(`../${nome}`, import.meta.url), "utf8");

test("compose declara o servico com restart e porta configuravel", async () => {
  const yml = await ler("docker-compose.yml");
  assert.match(yml, /^services:/m);
  assert.match(yml, /restart:\s*unless-stopped/);
  assert.match(yml, /\$\{APP_PORT:-3000\}:3000/);
});

test("healthcheck usa wget, que existe na imagem alpine", async () => {
  const yml = await ler("docker-compose.yml");
  assert.match(yml, /healthcheck:/);
  assert.match(yml, /wget/);
  assert.doesNotMatch(yml, /curl/);
  assert.match(yml, /127\.0\.0\.1:3000/);
});

test("env de exemplo documenta APP_PORT sem segredos", async () => {
  const env = await ler(".env.example");
  assert.match(env, /APP_PORT=\d+/);
  // `[^\S\n]*` em vez de `\s*`: sem isso o padrao atravessa a quebra de linha
  // e casa `SECRET=` (valor vazio) com o `#` do comentario seguinte.
  assert.doesNotMatch(env, /(token|secret|senha|password|key)[^\S\n]*=[^\S\n]*\S+/i);
});

test("gitignore ignora .env mas versiona .env.example", async () => {
  const gi = await ler(".gitignore");
  assert.match(gi, /^\.env\*$/m);
  assert.match(gi, /^!\.env\.example$/m);
});
