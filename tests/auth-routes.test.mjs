import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";
process.env.GOOGLE_CLIENT_ID = "cliente-de-teste.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "segredo-do-google-de-teste";

const { POST: login } = await import("../src/app/api/auth/google/route.ts");
const { GET: me } = await import("../src/app/api/auth/me/route.ts");
const { POST: logout } = await import("../src/app/api/auth/logout/route.ts");
const { SESSION_COOKIE, signSessionToken } = await import("../src/lib/session.ts");

const BASE = "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL;
const semBanco = !DATABASE_URL;

function pedidoLogin(body, headers = {}) {
        return new Request(`${BASE}/api/auth/google`, {
                method: "POST",
                headers: { "content-type": "application/json", host: "localhost:3000", ...headers },
                body: typeof body === "string" ? body : JSON.stringify(body),
        });
}

function pedidoMe(cookie) {
        return new Request(`${BASE}/api/auth/me`, {
                headers: cookie ? { cookie } : {},
        });
}

// --- rotas que nao dependem do banco ----------------------------------------

test("login recusa JSON invalido com 400", async () => {
        const response = await login(pedidoLogin("{nao-e-json"));

        assert.equal(response.status, 400);
        assert.equal((await response.json()).error, "json_invalido");
});

test("login recusa corpo sem code com 400", async () => {
        for (const body of [{}, { code: "" }, { code: "   " }, { code: 42 }, null, []]) {
                const response = await login(pedidoLogin(body));

                assert.equal(response.status, 400, `corpo ${JSON.stringify(body)}`);
                assert.equal((await response.json()).error, "code_ausente");
        }
});

test("login recusa origem estrangeira com 403", async () => {
        const response = await login(pedidoLogin({ code: "x" }, { origin: "https://site-malicioso.com" }));

        assert.equal(response.status, 403);
        assert.equal((await response.json()).error, "origem_invalida");
});

// Sem as credenciais do Google o login falha na montagem do cliente, antes de
// qualquer chamada de rede. Isso mantem estes testes deterministicos e permite
// observar o que acontece depois do CSRF sem depender do Google.
async function semCredenciaisDoGoogle(executar) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        delete process.env.GOOGLE_CLIENT_SECRET;

        try {
                return await executar();
        } finally {
                process.env.GOOGLE_CLIENT_ID = clientId;
                process.env.GOOGLE_CLIENT_SECRET = clientSecret;
        }
}

test("login aceita a propria origem", async () => {
        const response = await semCredenciaisDoGoogle(() =>
                login(pedidoLogin({ code: "x" }, { origin: BASE })),
        );

        assert.equal(response.status, 500);
        assert.equal((await response.json()).error, "falha_no_login");
});

test("a falha do login nao vaza detalhe interno", async () => {
        const response = await semCredenciaisDoGoogle(() => login(pedidoLogin({ code: "x" })));
        const corpo = await response.json();

        assert.deepEqual(Object.keys(corpo), ["error"]);
        assert.doesNotMatch(JSON.stringify(corpo), /GOOGLE_CLIENT|segredo|fetch|ENOTFOUND/i);
});

test("o login nao e rejeitado quando a origem ausente e aceita", async () => {
        // um cliente que nao e navegador nao manda Origin; o CSRF nao pode barrar
        const response = await semCredenciaisDoGoogle(() => login(pedidoLogin({ code: "x" })));

        assert.notEqual(response.status, 403);
});

test("me sem cookie responde 401", async () => {
        const response = await me(pedidoMe(null));

        assert.equal(response.status, 401);
        assert.equal((await response.json()).error, "nao_autenticado");
});

test("me com token invalido responde 401", async () => {
        const response = await me(pedidoMe(`${SESSION_COOKIE}=lixo`));

        assert.equal(response.status, 401);
        assert.equal((await response.json()).error, "sessao_invalida");
});

test("me com cookie malformado responde 401, e nao 500", async () => {
        const response = await me(pedidoMe(`${SESSION_COOKIE}=%`));

        assert.equal(response.status, 401);
        assert.equal((await response.json()).error, "nao_autenticado");
});

test("logout limpa o cookie e responde 200", async () => {
        const response = await logout(new Request(`${BASE}/api/auth/logout`, { method: "POST" }));
        const cookies = response.headers.getSetCookie();

        assert.equal(response.status, 200);
        assert.equal((await response.json()).ok, true);
        assert.equal(cookies.length, 1);
        assert.match(cookies[0], new RegExp(`^${SESSION_COOKIE}=;`));
        assert.match(cookies[0], /Max-Age=0/);
        assert.match(cookies[0], /HttpOnly/);
});

test("logout recusa origem estrangeira", async () => {
        const response = await logout(
                new Request(`${BASE}/api/auth/logout`, {
                        method: "POST",
                        headers: { origin: "https://site-malicioso.com", host: "localhost:3000" },
                }),
        );

        assert.equal(response.status, 403);
});

// --- rotas com Postgres real ------------------------------------------------

if (semBanco) {
        test("rotas com sessao real (puladas: DATABASE_URL ausente)", { skip: true }, () => {});
} else {
        const { PrismaPg } = await import("@prisma/adapter-pg");
        const { PrismaClient } = await import("../src/generated/prisma/client.ts");
        const { prisma } = await import("../src/lib/prisma.ts");

        const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
        const limpar = () => db.user.deleteMany({ where: { email: { endsWith: "@teste-rota.local" } } });

        before(limpar);
        beforeEach(limpar);
        after(async () => {
                await limpar();
                await db.$disconnect();
        });

        test("me devolve o usuario da sessao, sem campos internos", async () => {
                const user = await db.user.create({
                        data: { email: "sessao@teste-rota.local", name: "Sessao", googleId: "sub-sessao" },
                });
                const token = await signSessionToken({ userId: user.id, email: user.email });

                const response = await me(pedidoMe(`${SESSION_COOKIE}=${token}`));
                const corpo = await response.json();

                assert.equal(response.status, 200);
                assert.deepEqual(corpo.user, {
                        id: user.id,
                        email: "sessao@teste-rota.local",
                        name: "Sessao",
                        avatarUrl: null,
                        emailVerified: false,
                });
                assert.equal(corpo.user.googleId, undefined);
        });

        test("me responde 401 quando o usuario da sessao nao existe mais", async () => {
                const token = await signSessionToken({
                        userId: "00000000-0000-0000-0000-000000000000",
                        email: "fantasma@teste-rota.local",
                });

                const response = await me(pedidoMe(`${SESSION_COOKIE}=${token}`));

                assert.equal(response.status, 401);
                assert.equal((await response.json()).error, "usuario_nao_encontrado");
        });

        test("o prisma compartilhado da aplicacao alcanca o banco", async () => {
                // exercita o singleton de src/lib/prisma.ts, e nao uma conexao do teste
                const total = await prisma.user.count();

                assert.equal(typeof total, "number");
        });
}
