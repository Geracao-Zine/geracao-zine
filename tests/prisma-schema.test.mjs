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

// --- Fase 8.1: model Zine ---------------------------------------------------

const blocoZine = schema.slice(schema.indexOf("model Zine"), schema.indexOf("@@map(\"zines\")"));

test("o model Zine cobre os campos exigidos pela conta", () => {
  for (const campo of ["id", "ownerId", "title", "visibility", "content", "slug", "createdAt", "updatedAt"]) {
    assert.match(blocoZine, new RegExp(`^\\s*${campo}\\s+`, "m"), `falta o campo ${campo}`);
  }
});

test("id e ownerId sao uuid, e o dono e uma FK para User", () => {
  assert.match(blocoZine, /id\s+String\s+@id\s+@default\(uuid\(\)\)\s+@db\.Uuid/);
  assert.match(blocoZine, /ownerId\s+String\s+@db\.Uuid/);
  assert.match(blocoZine, /owner\s+User\s+@relation\(fields:\s*\[ownerId\],\s*references:\s*\[id\]/);
});

test("apagar o dono nao deixa zine orfao", () => {
  // sem onDelete o banco recusa apagar o usuario e a conta fica impossivel de remover
  assert.match(blocoZine, /onDelete:\s*Cascade/);
});

test("visibility e enum com public como padrao", () => {
  const enumZine = schema.slice(schema.indexOf("enum ZineVisibility"), schema.indexOf("model Zine"));

  assert.match(enumZine, /^\s*private\s*$/m);
  assert.match(enumZine, /^\s*public\s*$/m);
  assert.match(blocoZine, /visibility\s+ZineVisibility\s+@default\(public\)/);
});

test("o conteudo e JSON e carrega a versao do formato desde o inicio", () => {
  // versionar depois exigiria adivinhar a forma de cada linha ja gravada
  assert.match(blocoZine, /content\s+Json/);
  assert.match(blocoZine, /contentVersion\s+Int\s+@default\(1\)/);
});

test("o slug e unico e opcional, porque zine privado nao tem URL publica", () => {
  assert.match(blocoZine, /slug\s+String\?\s+@unique/);
});

test("ha indice para a lista do dono e para a listagem publica", () => {
  assert.match(blocoZine, /@@index\(\[ownerId\]\)/);
  // a biblioteca publica filtra por visibility e ordena por updatedAt
  assert.match(blocoZine, /@@index\(\[visibility,\s*updatedAt\]\)/);
});

test("User declara o lado inverso da relacao", () => {
  const blocoUser = schema.slice(schema.indexOf("model User"), schema.indexOf("enum ZineVisibility"));

  assert.match(blocoUser, /zines\s+Zine\[\]/);
});

test("a migration do model Zine cria a tabela, o enum e os indices", async () => {
  const sql = await ler("prisma/migrations/20261124185810_add_zine_model/migration.sql");

  assert.match(sql, /CREATE TYPE "ZineVisibility" AS ENUM \('private', 'public'\)/);
  assert.match(sql, /CREATE TABLE "zines"/);
  assert.match(sql, /"visibility" "ZineVisibility" NOT NULL DEFAULT 'private'/);
  assert.match(sql, /"content" JSONB NOT NULL/);
  assert.match(sql, /"contentVersion" INTEGER NOT NULL DEFAULT 1/);
  assert.match(sql, /CREATE UNIQUE INDEX "zines_slug_key"/);
  assert.match(sql, /CREATE INDEX "zines_ownerId_idx"/);
  assert.match(sql, /CREATE INDEX "zines_visibility_updatedAt_idx"/);
  assert.match(sql, /ON DELETE CASCADE/);
});
