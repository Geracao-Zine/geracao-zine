import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const entrypoint = join(raiz, "docker-entrypoint.sh");

/**
 * Monta um /app de mentira com um `prisma` falso que registra a chamada e um
 * server.js que so imprime. O entrypoint roda de verdade, entao o que se testa
 * e o comportamento do script, nao o texto dele.
 */
async function cenario({ falharSempre = false } = {}) {
        const dir = await mkdtemp(join(tmpdir(), "entrypoint-"));
        const migrate = join(dir, "migrate");
        const bin = join(migrate, "node_modules", ".bin");
        const registro = join(dir, "chamadas.txt");

        await mkdir(bin, { recursive: true });
        await writeFile(
                join(bin, "prisma"),
                [
                        "#!/bin/sh",
                        `echo "cwd=$(pwd) args=$*" >> "${registro}"`,
                        falharSempre ? "exit 1" : "exit 0",
                        "",
                ].join("\n"),
        );
        await chmod(join(bin, "prisma"), 0o755);
        await writeFile(join(dir, "server.js"), 'console.log("SERVIDOR_NO_AR");\n');

        return {
                dir,
                async rodar(env = {}) {
                        return new Promise((resolve) => {
                                execFile(
                                        "sh",
                                        [entrypoint],
                                        {
                                                cwd: dir,
                                                env: {
                                                        PATH: process.env.PATH,
                                                        APP_DIR: dir,
                                                        MIGRATE_DIR: migrate,
                                                        ...env,
                                                },
                                        },
                                        (erro, stdout, stderr) => {
                                                resolve({
                                                        codigo: erro?.code ?? 0,
                                                        saida: stdout + stderr,
                                                });
                                        },
                                );
                        });
                },
                async chamadas() {
                        try {
                                return (await readFile(registro, "utf8")).trim().split("\n").filter(Boolean);
                        } catch {
                                return [];
                        }
                },
                limpar: () => rm(dir, { recursive: true, force: true }),
        };
}

test("aplica as migrations antes de subir o servidor", async () => {
        const c = await cenario();

        try {
                const { codigo, saida } = await c.rodar({ DATABASE_URL: "postgresql://u:p@db:5432/x" });

                assert.equal(codigo, 0);
                assert.match(saida, /SERVIDOR_NO_AR/);

                const chamadas = await c.chamadas();

                assert.equal(chamadas.length, 1);
                assert.match(chamadas[0], /args=migrate deploy$/);
                // O CLI so acha prisma7.config.ts e prisma/ se rodar do diretorio dele.
                assert.match(chamadas[0], new RegExp(`^cwd=${c.dir}/migrate`));
        } finally {
                await c.limpar();
        }
});

test("sem DATABASE_URL nao tenta migrar, mas sobe mesmo assim", async () => {
        const c = await cenario();

        try {
                const { codigo, saida } = await c.rodar();

                assert.equal(codigo, 0);
                assert.match(saida, /SERVIDOR_NO_AR/);
                assert.equal((await c.chamadas()).length, 0, "nao deve chamar o prisma sem DATABASE_URL");
        } finally {
                await c.limpar();
        }
});

test("quando as migrations falham, o servidor nao sobe e o exit e 1", async () => {
        const c = await cenario({ falharSempre: true });

        try {
                const { codigo, saida } = await c.rodar({
                        DATABASE_URL: "postgresql://u:p@db:5432/x",
                        MIGRATE_TENTATIVAS: "2",
                });

                // Subir sem as tabelas daria 500 em toda rota de dados; falhar alto e
                // melhor, porque o Coolify marca o deploy como falho em vez de fingir
                // que deu certo.
                assert.equal(codigo, 1);
                assert.doesNotMatch(saida, /SERVIDOR_NO_AR/);
                assert.equal((await c.chamadas()).length, 2, "deve respeitar MIGRATE_TENTATIVAS");
        } finally {
                await c.limpar();
        }
});

test("o entrypoint e um script sh valido e executavel", async () => {
        const conteudo = await readFile(entrypoint, "utf8");

        assert.match(conteudo, /^#!\/bin\/sh/);
        assert.match(conteudo, /exec node server\.js/);
});
