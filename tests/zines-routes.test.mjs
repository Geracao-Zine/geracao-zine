import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";

const zines = await import("../src/app/api/zines/route.ts");
const detalhe = await import("../src/app/api/zines/[id]/route.ts");
const { SESSION_COOKIE, signSessionToken } = await import("../src/lib/session.ts");

const BASE = "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL;
const semBanco = !DATABASE_URL;

const CONTEUDO = { version: 1, cover: { title: "Teste" }, doc: { pages: [] } };

function pedidoLista(cookie, query = "") {
        return new Request(`${BASE}/api/zines${query}`, { headers: cookie ? { cookie } : {} });
}

function pedidoCria(body, cookie, headers = {}) {
        return new Request(`${BASE}/api/zines`, {
                method: "POST",
                headers: {
                        "content-type": "application/json",
                        host: "localhost:3000",
                        ...(cookie ? { cookie } : {}),
                        ...headers,
                },
                body: typeof body === "string" ? body : JSON.stringify(body),
        });
}

function pedidoDetalhe(id, cookie, init = {}) {
        return new Request(`${BASE}/api/zines/${id}`, {
                ...init,
                headers: {
                        host: "localhost:3000",
                        ...(cookie ? { cookie } : {}),
                        ...(init.headers ?? {}),
                },
        });
}

// --- rotas que nao dependem do banco ----------------------------------------

test("lista sem sessao e sem escopo responde 401", async () => {
        const response = await zines.GET(pedidoLista(null));

        assert.equal(response.status, 401);
        assert.equal((await response.json()).error, "nao_autenticado");
});

test("sessao com token invalido responde 401", async () => {
        const response = await zines.GET(pedidoLista(`${SESSION_COOKIE}=token-forjado`));

        assert.equal(response.status, 401);
        assert.equal((await response.json()).error, "sessao_invalida");
});

test("criar sem sessao responde 401 e nao chega a validar o corpo", async () => {
        const response = await zines.POST(pedidoCria({ lixo: true }, null));

        assert.equal(response.status, 401);
});

test("criar recusa JSON invalido com 400", async () => {
        const response = await zines.POST(pedidoCria("{nao-e-json", null));

        assert.equal(response.status, 400);
        assert.equal((await response.json()).error, "json_invalido");
});

test("criar recusa origem estrangeira com 403", async () => {
        const response = await zines.POST(pedidoCria({}, null, { origin: "https://site-malicioso.com" }));

        assert.equal(response.status, 403);
        assert.equal((await response.json()).error, "origem_invalida");
});

test("detalhe sem sessao e sem banco ja responde 401 antes de consultar", async () => {
        // o GET aceita leitura publica, entao um id inexistente chega ao banco.
        // Aqui o objetivo e so garantir que a rota existe e responde JSON.
        const response = await detalhe.DELETE(pedidoDetalhe("x", null, { method: "DELETE" }));

        assert.equal(response.status, 401);
});

// --- rotas com Postgres real ------------------------------------------------

if (semBanco) {
        test("API de zines com banco (pulada: DATABASE_URL ausente)", { skip: true }, () => {});
} else {
        const { PrismaPg } = await import("@prisma/adapter-pg");
        const { PrismaClient } = await import("../src/generated/prisma/client.ts");

        const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

        const DONO = "dono@teste-zine.local";
        const OUTRO = "outro@teste-zine.local";

        const limpar = () => db.user.deleteMany({ where: { email: { endsWith: "@teste-zine.local" } } });

        async function criarUsuario(email) {
                return db.user.create({ data: { email, name: email, googleId: `sub-${email}` } });
        }

        let dono;
        let outro;
        let cookieDono;
        let cookieOutro;

        before(async () => {
                await limpar();
                dono = await criarUsuario(DONO);
                outro = await criarUsuario(OUTRO);
                cookieDono = `${SESSION_COOKIE}=${await signSessionToken({ userId: dono.id, email: DONO })}`;
                cookieOutro = `${SESSION_COOKIE}=${await signSessionToken({ userId: outro.id, email: OUTRO })}`;
        });

        beforeEach(async () => {
                await db.zine.deleteMany({ where: { owner: { email: { endsWith: "@teste-zine.local" } } } });
        });

        after(async () => {
                await db.zine.deleteMany({ where: { owner: { email: { endsWith: "@teste-zine.local" } } } });
                await limpar();
                await db.$disconnect();
        });

        async function criarZinePeloDono(body) {
                const response = await zines.POST(pedidoCria({ content: CONTEUDO, contentVersion: 1, ...body }, cookieDono));

                return { response, corpo: await response.json() };
        }

        test("criar devolve 201 e grava o zine do dono da sessao", async () => {
                const { response, corpo } = await criarZinePeloDono({ title: "Meu Zine" });

                assert.equal(response.status, 201);
                assert.equal(corpo.zine.title, "Meu Zine");
                assert.equal(corpo.zine.visibility, "private");
                assert.equal(corpo.zine.slug, null);

                const gravado = await db.zine.findUniqueOrThrow({ where: { id: corpo.zine.id } });

                assert.equal(gravado.ownerId, dono.id);
        });

        test("ownerId do corpo e ignorado: o zine nasce do dono da sessao", async () => {
                const { corpo } = await criarZinePeloDono({
                        title: "Forjado",
                        ownerId: outro.id,
                });

                const gravado = await db.zine.findUniqueOrThrow({ where: { id: corpo.zine.id } });

                assert.equal(gravado.ownerId, dono.id, "o ownerId do corpo nao pode valer");
        });

        test("criar publico define slug legivel; privado fica sem slug", async () => {
                const { corpo: publico } = await criarZinePeloDono({ title: "Poesias de Inverno", visibility: "public" });
                const { corpo: privado } = await criarZinePeloDono({ title: "Rascunho" });

                assert.equal(publico.zine.slug, "poesias-de-inverno");
                assert.equal(privado.zine.slug, null);
        });

        test("dois zines publicos com o mesmo titulo recebem slugs diferentes", async () => {
                const { corpo: primeiro } = await criarZinePeloDono({ title: "Mesmo Titulo", visibility: "public" });
                const { corpo: segundo } = await criarZinePeloDono({ title: "Mesmo Titulo", visibility: "public" });

                assert.notEqual(primeiro.zine.slug, segundo.zine.slug);
                assert.equal(primeiro.zine.slug, "mesmo-titulo");
        });

        test("lista do dono traz so os zines dele", async () => {
                await criarZinePeloDono({ title: "Do Dono" });
                await zines.POST(pedidoCria({ title: "Do Outro", content: CONTEUDO, contentVersion: 1 }, cookieOutro));

                const response = await zines.GET(pedidoLista(cookieDono));
                const corpo = await response.json();

                assert.equal(response.status, 200);
                assert.deepEqual(
                        corpo.zines.map((z) => z.title),
                        ["Do Dono"]
                );
        });

        test("lista do dono nao expoe ownerId", async () => {
                await criarZinePeloDono({ title: "Sem dono exposto" });

                const corpo = await (await zines.GET(pedidoLista(cookieDono))).json();

                assert.equal(corpo.zines[0].ownerId, undefined);
        });

        test("CRITERIO: zine privado nao aparece na listagem publica", async () => {
                await criarZinePeloDono({ title: "Privado", visibility: "private" });
                await criarZinePeloDono({ title: "Publico", visibility: "public" });

                const response = await zines.GET(pedidoLista(null, "?scope=public"));
                const corpo = await response.json();

                assert.equal(response.status, 200);
                assert.deepEqual(
                        corpo.zines.map((z) => z.title),
                        ["Publico"]
                );
        });

        test("CRITERIO: dono nao consegue ler zine de outro dono (404, nao 403)", async () => {
                const { corpo } = await criarZinePeloDono({ title: "Segredo" });

                const response = await detalhe.GET(pedidoDetalhe(corpo.zine.id, cookieOutro), {
                        params: Promise.resolve({ id: corpo.zine.id }),
                });

                assert.equal(response.status, 404, "403 vazaria a existencia do zine");
                assert.equal((await response.json()).error, "zine_nao_encontrado");
        });

        test("CRITERIO: dono nao consegue apagar zine de outro dono", async () => {
                const { corpo } = await criarZinePeloDono({ title: "Intocavel" });

                const response = await detalhe.DELETE(
                        pedidoDetalhe(corpo.zine.id, cookieOutro, { method: "DELETE" }),
                        { params: Promise.resolve({ id: corpo.zine.id }) }
                );

                assert.equal(response.status, 404);

                const aindaExiste = await db.zine.findUnique({ where: { id: corpo.zine.id } });

                assert.ok(aindaExiste, "o zine alheio nao pode ser apagado");
        });

        test("dono nao consegue editar zine de outro dono", async () => {
                const { corpo } = await criarZinePeloDono({ title: "Original" });

                const response = await detalhe.PATCH(
                        pedidoDetalhe(corpo.zine.id, cookieOutro, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ title: "Invadido" }),
                        }),
                        { params: Promise.resolve({ id: corpo.zine.id }) }
                );

                assert.equal(response.status, 404);

                const gravado = await db.zine.findUniqueOrThrow({ where: { id: corpo.zine.id } });

                assert.equal(gravado.title, "Original");
        });

        test("dono le o proprio zine privado", async () => {
                const { corpo } = await criarZinePeloDono({ title: "Meu" });

                const response = await detalhe.GET(pedidoDetalhe(corpo.zine.id, cookieDono), {
                        params: Promise.resolve({ id: corpo.zine.id }),
                });

                assert.equal(response.status, 200);
                assert.equal((await response.json()).zine.title, "Meu");
        });

        test("sem sessao, zine publico e legivel e privado responde 404", async () => {
                const { corpo: publico } = await criarZinePeloDono({ title: "Aberto", visibility: "public" });
                const { corpo: privado } = await criarZinePeloDono({ title: "Fechado" });

                const aberto = await detalhe.GET(pedidoDetalhe(publico.zine.id, null), {
                        params: Promise.resolve({ id: publico.zine.id }),
                });
                const fechado = await detalhe.GET(pedidoDetalhe(privado.zine.id, null), {
                        params: Promise.resolve({ id: privado.zine.id }),
                });

                assert.equal(aberto.status, 200);
                assert.equal(fechado.status, 404);
        });

        test("usuario logado le zine publico de outro dono", async () => {
                const { corpo } = await criarZinePeloDono({ title: "Compartilhado", visibility: "public" });

                const response = await detalhe.GET(pedidoDetalhe(corpo.zine.id, cookieOutro), {
                        params: Promise.resolve({ id: corpo.zine.id }),
                });

                assert.equal(response.status, 200);
        });

        test("atualizar titulo e conteudo grava o novo estado", async () => {
                const { corpo } = await criarZinePeloDono({ title: "Velho" });
                const novoConteudo = { version: 2, cover: { title: "Novo" } };

                const response = await detalhe.PATCH(
                        pedidoDetalhe(corpo.zine.id, cookieDono, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ title: "Novo", content: novoConteudo, contentVersion: 2 }),
                        }),
                        { params: Promise.resolve({ id: corpo.zine.id }) }
                );
                const atualizado = (await response.json()).zine;

                assert.equal(response.status, 200);
                assert.equal(atualizado.title, "Novo");
                assert.equal(atualizado.contentVersion, 2);
                assert.deepEqual(atualizado.content, novoConteudo);
        });

        test("publicar pelo PATCH cria o slug e voltar a privado o remove", async () => {
                const { corpo } = await criarZinePeloDono({ title: "Vai Publicar" });

                const publicando = await detalhe.PATCH(
                        pedidoDetalhe(corpo.zine.id, cookieDono, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ visibility: "public" }),
                        }),
                        { params: Promise.resolve({ id: corpo.zine.id }) }
                );
                assert.equal((await publicando.json()).zine.slug, "vai-publicar");

                const privando = await detalhe.PATCH(
                        pedidoDetalhe(corpo.zine.id, cookieDono, {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ visibility: "private" }),
                        }),
                        { params: Promise.resolve({ id: corpo.zine.id }) }
                );

                assert.equal((await privando.json()).zine.slug, null);
        });

        test("dono apaga o proprio zine e ele some do banco", async () => {
                const { corpo } = await criarZinePeloDono({ title: "Descartavel" });

                const response = await detalhe.DELETE(
                        pedidoDetalhe(corpo.zine.id, cookieDono, { method: "DELETE" }),
                        { params: Promise.resolve({ id: corpo.zine.id }) }
                );

                assert.equal(response.status, 204);
                assert.equal(await db.zine.findUnique({ where: { id: corpo.zine.id } }), null);
        });

        test("id fora do formato uuid responde 404, nao 500", async () => {
                const response = await detalhe.GET(pedidoDetalhe("nao-e-um-uuid", cookieDono), {
                        params: Promise.resolve({ id: "nao-e-um-uuid" }),
                });

                assert.equal(response.status, 404);
        });

        test("criar com corpo invalido responde 400 e nao grava nada", async () => {
                const response = await zines.POST(pedidoCria({ title: "" }, cookieDono));

                assert.equal(response.status, 400);
                assert.equal(await db.zine.count({ where: { ownerId: dono.id } }), 0);
        });
}
