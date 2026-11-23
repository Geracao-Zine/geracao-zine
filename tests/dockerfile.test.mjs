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
