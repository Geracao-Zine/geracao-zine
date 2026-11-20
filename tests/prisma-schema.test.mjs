import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const ler = (nome) => readFile(new URL(`../${nome}`, import.meta.url), "utf8");

const schema = await ler("prisma/schema.prisma");

test("o datasource aponta para postgresql", () => {
  assert.match(schema, /provider\s*=\s*"postgresql"/);
});

test("o model User cobre os campos exigidos pelo login", () => {
  const bloco = schema.slice(schema.indexOf("model User"));

  for (const campo of ["id", "email", "name", "avatarUrl", "googleId", "emailVerified", "createdAt", "updatedAt"]) {
    assert.match(bloco, new RegExp(`^\\s*${campo}\\s+`, "m"), `falta o campo ${campo}`);
  }
});

test("id e uuid, email e googleId sao unicos", () => {
  const bloco = schema.slice(schema.indexOf("model User"));

  assert.match(bloco, /id\s+String\s+@id\s+@default\(uuid\(\)\)/);
  assert.match(bloco, /email\s+String\s+@unique/);
  assert.match(bloco, /googleId\s+String\?\s+@unique/);
});

test("emailVerified tem default false e updatedAt e automatico", () => {
  const bloco = schema.slice(schema.indexOf("model User"));

  assert.match(bloco, /emailVerified\s+Boolean\s+@default\(false\)/);
  assert.match(bloco, /createdAt\s+DateTime\s+@default\(now\(\)\)/);
  assert.match(bloco, /updatedAt\s+DateTime\s+@updatedAt/);
});

test("a migration inicial existe e cria a tabela com os indices unicos", async () => {
  const sql = await ler("prisma/migrations/20261120133847_init_auth/migration.sql");

  assert.match(sql, /CREATE TABLE "users"/);
  assert.match(sql, /"id" UUID NOT NULL/);
  assert.match(sql, /CREATE UNIQUE INDEX "users_email_key"/);
  assert.match(sql, /CREATE UNIQUE INDEX "users_googleId_key"/);
  assert.match(sql, /"emailVerified" BOOLEAN NOT NULL DEFAULT false/);
});

test("o singleton do Prisma reaproveita a instancia entre reloads", async () => {
  const fonte = await ler("src/lib/prisma.ts");

  // sem o cache no globalThis, o hot reload vaza um pool por edicao
  assert.match(fonte, /globalThis/);
  assert.match(fonte, /\?\?=\s*createClient\(\)/);
  assert.match(fonte, /PrismaPg/);
  assert.match(fonte, /DATABASE_URL/);
});

test("o client do Prisma nao conecta no import, e sim no primeiro acesso", async () => {
  const fonte = await ler("src/lib/prisma.ts");

  // o `next build` importa os route handlers sem DATABASE_URL; criar o pool no
  // topo do modulo quebraria o build em qualquer CI sem banco
  assert.match(fonte, /new Proxy/);
  assert.doesNotMatch(fonte, /^const prisma\s*=\s*createClient\(\)/m);
});

test("o build gera o client antes de compilar", async () => {
  const pkg = JSON.parse(await ler("package.json"));

  // src/generated esta no .gitignore: sem gerar no build, um clone limpo quebra
  assert.match(pkg.scripts.prebuild ?? "", /prisma generate/);
  assert.match(pkg.scripts.postinstall ?? "", /prisma generate/);
});

test(".env.example documenta DATABASE_URL", async () => {
  assert.match(await ler(".env.example"), /DATABASE_URL=/);
});

test("a senha do banco nao aparece em arquivo versionado", async () => {
  // .env e o unico lugar com a credencial real; o exemplo usa a padrao local
  const exemplo = await ler(".env.example");
  assert.doesNotMatch(exemplo, /postgres(ql)?:\/\/[^"]*:([^z"][^@]*)@/);
});
