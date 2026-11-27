import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

function ler(rel) {
	return readFileSync(join(raiz, rel), "utf8");
}

test("o build gera saida standalone", () => {
	const config = ler("next.config.ts");

	assert.ok(
		/output:\s*["']standalone["']/.test(config),
		"next.config.ts precisa de output: \"standalone\" para o Dockerfile funcionar",
	);
});

test("o Dockerfile tem os tres estagios", () => {
	const dockerfile = ler("Dockerfile");

	for (const estagio of ["deps", "builder", "runner"]) {
		assert.ok(
			new RegExp(`FROM\\s+\\S+\\s+AS\\s+${estagio}\\b`).test(dockerfile),
			`falta o estagio ${estagio}`,
		);
	}
});

test("as migrations rodam na subida do container", () => {
	const dockerfile = ler("Dockerfile");

	// O runner nao tem o CLI do Prisma, entao as migrations precisam vir de um
	// estagio proprio e ser acionadas pelo entrypoint.
	assert.match(dockerfile, /FROM\s+\S+\s+AS\s+migrator\b/);
	assert.match(dockerfile, /COPY --from=migrator[^\n]*\/migrate/);
	assert.match(dockerfile, /CMD\s+\["\.\/docker-entrypoint\.sh"\]/);

	// Sem o diretorio de migrations e o config dentro do estagio, o `migrate
	// deploy` nao teria o que aplicar.
	const migrator = dockerfile.slice(
		dockerfile.indexOf("AS migrator"),
		dockerfile.indexOf("AS runner"),
	);

	assert.match(migrator, /COPY prisma \.\/prisma/);
	assert.match(migrator, /COPY prisma7\.config\.ts \.\//);
});

test("o CLI do Prisma nao entra no node_modules do app", () => {
	const dockerfile = ler("Dockerfile");
	const runner = dockerfile.slice(dockerfile.indexOf("AS runner"));

	// Instalar o CLI dentro do /app sobrescreveria modulos que o standalone ja
	// resolveu, e o CLI arrasta centenas de MB.
	assert.doesNotMatch(
		runner,
		/COPY --from=migrator[^\n]*\/migrate \.\/?$/m,
		"o diretorio do migrator nao pode ser copiado para a raiz do /app",
	);
	assert.match(runner, /\/app\/migrate/);
});

test("o estagio do migrator nao instala o devDependencies do projeto", () => {
	const dockerfile = ler("Dockerfile");
	const migrator = dockerfile.slice(
		dockerfile.indexOf("AS migrator"),
		dockerfile.indexOf("AS runner"),
	);

	// `npm ci` com o package.json do projeto baixaria ~900 MB para rodar um comando.
	assert.doesNotMatch(migrator, /npm ci/);
	assert.match(migrator, /npm install[^\n]*prisma@/);
});

test("o entrypoint entra na imagem antes de trocar para usuario nao-root", () => {
	const dockerfile = ler("Dockerfile");
	const runner = dockerfile.slice(dockerfile.indexOf("AS runner"));

	assert.ok(
		runner.indexOf("docker-entrypoint.sh ./docker-entrypoint.sh") < runner.indexOf("USER nextjs"),
		"copiar depois do USER deixaria o arquivo sem permissao de execucao",
	);
	assert.match(runner, /chmod \+x \.\/docker-entrypoint\.sh/);
});

test("o estagio final roda node:26-alpine e sem root", () => {
	const dockerfile = ler("Dockerfile");
	const final = dockerfile.slice(dockerfile.lastIndexOf("FROM "));

	assert.ok(/FROM\s+node:26-alpine\s+AS\s+runner/.test(dockerfile));
	assert.ok(/USER\s+nextjs/.test(final), "o container deve rodar com usuario nao-root");
	assert.ok(/adduser[^\n]*--uid\s+1001/.test(dockerfile), "o usuario precisa de uid fixo");
});

test("o estagio final copia apenas o necessario do standalone", () => {
	const dockerfile = ler("Dockerfile");

	assert.ok(/COPY --from=builder[^\n]*\/\.next\/standalone/.test(dockerfile));
	assert.ok(/COPY --from=builder[^\n]*\/\.next\/static/.test(dockerfile));
	assert.ok(/COPY --from=builder[^\n]*\/public/.test(dockerfile));
});

test("o typescript sai no builder, nao no estagio final", () => {
	const dockerfile = ler("Dockerfile");
	const indiceRunner = dockerfile.indexOf("AS runner");
	const remocao = dockerfile.indexOf("rm -rf .next/standalone/node_modules/typescript");

	assert.ok(remocao > 0, "o typescript arrastado pelo standalone deve ser removido");
	assert.ok(
		remocao < indiceRunner,
		"remover no estagio final nao diminui a imagem: os bytes ficam na camada do COPY",
	);
});

test("o .dockerignore exclui o que nao entra na imagem", () => {
	const ignorados = ler(".dockerignore").split("\n").map((l) => l.trim());

	for (const alvo of ["node_modules", ".next", ".git", "*.md", ".env*"]) {
		assert.ok(ignorados.includes(alvo), `.dockerignore precisa excluir ${alvo}`);
	}
});
