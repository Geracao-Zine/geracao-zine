import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const raiz = new URL("../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(raiz, rel), "utf8");
const readme = ler("README.md");

function secaoDeploy() {
  const inicio = readme.indexOf("## Deploy em VPS com Nginx e TLS");
  assert.notEqual(inicio, -1, "README sem secao de deploy");
  const fim = readme.indexOf("\n## ", inicio + 10);
  return readme.slice(inicio, fim === -1 ? undefined : fim);
}

function blocoNginx(rotulo) {
  const secao = secaoDeploy();
  const i = secao.indexOf(rotulo);
  assert.notEqual(i, -1, `README sem o bloco ${rotulo}`);
  const abre = secao.indexOf("```nginx", i);
  const fecha = secao.indexOf("```", abre + 8);
  return secao.slice(abre + 8, fecha);
}

test("o sumario aponta para a secao de deploy", () => {
  assert.match(readme, /\[Deploy em VPS com Nginx e TLS\]\(#deploy-em-vps-com-nginx-e-tls\)/);
});

function secaoRollback() {
  const secao = secaoDeploy();
  const i = secao.indexOf("### 9. Rollback");
  assert.notEqual(i, -1, "README sem a subsecao de rollback");
  const fim = secao.indexOf("\n### ", i + 5);
  return secao.slice(i, fim === -1 ? undefined : fim);
}

test("o rollback tem os dois caminhos, git e tag de imagem", () => {
  const rollback = secaoRollback();
  assert.match(rollback, /git checkout \S+/, "rollback sem checkout de um commit");
  assert.match(rollback, /docker compose up -d --build/, "rollback sem reconstruir a imagem");
  assert.match(rollback, /git checkout master/, "rollback nao ensina a voltar para a linha principal");
  assert.match(rollback, /docker tag \S+ \S+/, "rollback sem o caminho por tag de imagem");
  assert.match(rollback, /docker compose up -d\b/, "rollback por tag sem subir o container");
});

test("o proxy usa a porta que o proprio roteiro manda publicar", () => {
  const secao = secaoDeploy();
  // O roteiro publica o app em APP_PORT=80 e poe o Nginx na frente.
  const publicada = secao.match(/APP_PORT=(\d+)/);
  assert.ok(publicada, "roteiro nao define APP_PORT");
  const site = blocoNginx("sites-available/geracao-zine");
  const portas = [...site.matchAll(/proxy_pass http:\/\/127\.0\.0\.1:(\d+);/g)].map((m) => m[1]);
  assert.ok(portas.length >= 2, "o proxy deve cobrir / e /_next/static/");
  for (const porta of portas) {
    assert.equal(
      porta,
      publicada[1],
      `proxy_pass na porta ${porta}, mas o roteiro publica em ${publicada[1]}`
    );
  }
});

test("o proxy nao duplica o Cache-Control que o Next ja envia", () => {
  const site = blocoNginx("sites-available/geracao-zine");
  assert.doesNotMatch(
    site,
    /add_header\s+Cache-Control/i,
    "o Next ja envia Cache-Control em /_next/static; repetir duplica o cabecalho"
  );
});

test("os headers de seguranca estao declarados", () => {
  const snippet = blocoNginx("security-headers.conf");
  for (const header of [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.ok(snippet.includes(header), `snippet sem ${header}`);
  }
});

test("o documento nao traz segredo nem dominio pessoal", () => {
  const secao = secaoDeploy();
  assert.doesNotMatch(secao, /ghp_|github_pat_|BEGIN (RSA|OPENSSH|PRIVATE)/);
  assert.doesNotMatch(secao, /password\s*=\s*\S+/i);
});

test("o deploy exige um healthcheck antes de seguir", () => {
  const compose = ler("docker-compose.yml");
  assert.match(compose, /healthcheck:/);
  assert.ok(secaoDeploy().includes("healthy"), "deploy nao cita o estado healthy");
});
