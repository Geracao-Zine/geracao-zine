import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";

const zines = await import("../src/app/api/zines/route.ts");
const detalhe = await import("../src/app/api/zines/[id]/route.ts");
const favorito = await import("../src/app/api/zines/[id]/favorite/route.ts");
const { SESSION_COOKIE, signSessionToken } = await import("../src/lib/session.ts");

const BASE = "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL;
const semBanco = !DATABASE_URL;

const CONTEUDO = { version: 1, cover: { title: "Teste" }, doc: { pages: [] } };

function pedidoLista(cookie, query = "") {
        return new Request(`${BASE}/api/zines${query}`, { headers: cookie ? { cookie } : {} });
}

function pedidoCria(body, cookie) {
        return new Request(`${BASE}/api/zines`, {
                method: "POST",
                headers: {
                        "content-type": "application/json",
                        host: "localhost:3000",
                        ...(cookie ? { cookie } : {}),
                },
                body: JSON.stringify(body),
        });
}

function pedidoFavorito(id, cookie, method) {
        return new Request(`${BASE}/api/zines/${id}/favorite`, {
                method,
                headers: { host: "localhost:3000", ...(cookie ? { cookie } : {}) },
        });
}

const params = (id) => ({ params: Promise.resolve({ id }) });

if (semBanco) {
        test("favoritos com banco (pulada: DATABASE_URL ausente)", { skip: true }, () => {});
} else {
        const { PrismaPg } = await import("@prisma/adapter-pg");
        const { PrismaClient } = await import("../src/generated/prisma/client.ts");

        const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

        const DONO = "favorito-dono@teste-favorito.local";
        const LEITOR = "favorito-leitor@teste-favorito.local";

        const limpar = () => db.user.deleteMany({ where: { email: { endsWith: "@teste-favorito.local" } } });

        let dono;
        let leitor;
        let cookieDono;
        let cookieLeitor;

        before(async () => {
                await limpar();
                dono = await db.user.create({
                        data: { email: DONO, name: "Autora do Zine", googleId: `sub-${DONO}` },
                });
                leitor = await db.user.create({
                        data: { email: LEITOR, name: "Leitora", googleId: `sub-${LEITOR}` },
                });
                cookieDono = `${SESSION_COOKIE}=${await signSessionToken({ userId: dono.id, email: DONO })}`;
                cookieLeitor = `${SESSION_COOKIE}=${await signSessionToken({ userId: leitor.id, email: LEITOR })}`;
        });

        beforeEach(async () => {
                await db.favorite.deleteMany({ where: { user: { email: { endsWith: "@teste-favorito.local" } } } });
                await db.zine.deleteMany({ where: { owner: { email: { endsWith: "@teste-favorito.local" } } } });
        });

        after(async () => {
                await db.favorite.deleteMany({ where: { user: { email: { endsWith: "@teste-favorito.local" } } } });
                await db.zine.deleteMany({ where: { owner: { email: { endsWith: "@teste-favorito.local" } } } });
                await limpar();
                await db.$disconnect();
        });

        // O padrao do zine e privado, entao o que este arquivo exercita — favoritar
        // um zine que outra pessoa pode ver — precisa dizer "public" para existir.
        async function criarZine(body, cookie = cookieDono) {
                const response = await zines.POST(
                        pedidoCria({ content: CONTEUDO, contentVersion: 1, visibility: "public", ...body }, cookie)
                );
                return (await response.json()).zine;
        }

        test("CRITERIO: autor e marcado como dono; outro usuario nao", async () => {
                const criado = await criarZine({ title: "Meu" });

                const comoDono = await (await zines.GET(pedidoLista(cookieDono))).json();
                const comoLeitor = await (await zines.GET(pedidoLista(cookieLeitor, "?scope=public"))).json();

                const meu = comoDono.zines.find((z) => z.id === criado.id);
                const alheio = comoLeitor.zines.find((z) => z.id === criado.id);

                assert.equal(meu.mine, true);
                assert.equal(alheio.mine, false, "quem nao escreveu nunca e dono");
        });

        test("a listagem publica credita o autor sem expor o email", async () => {
                const criado = await criarZine({ title: "Creditado" });

                const corpo = await (await zines.GET(pedidoLista(null, "?scope=public"))).json();

                assert.equal(corpo.zines.find((z) => z.id === criado.id).author.name, "Autora do Zine");
                assert.equal(JSON.stringify(corpo).includes(DONO), false, "o email nao pode vazar");
        });

        test("CRITERIO: usuario comum favorita um zine publico", async () => {
                const criado = await criarZine({ title: "Favoritavel" });

                const response = await favorito.POST(pedidoFavorito(criado.id, cookieLeitor, "POST"), params(criado.id));

                assert.equal(response.status, 200);
                assert.equal(await db.favorite.count({ where: { userId: leitor.id, zineId: criado.id } }), 1);
        });

        test("favoritar duas vezes nao cria duas linhas", async () => {
                const criado = await criarZine({ title: "Duas vezes" });

                await favorito.POST(pedidoFavorito(criado.id, cookieLeitor, "POST"), params(criado.id));
                const segunda = await favorito.POST(pedidoFavorito(criado.id, cookieLeitor, "POST"), params(criado.id));

                assert.equal(segunda.status, 200);
                assert.equal(await db.favorite.count({ where: { userId: leitor.id, zineId: criado.id } }), 1);
        });

        test("o favorito aparece marcado na biblioteca e na lista de favoritos", async () => {
                const criado = await criarZine({ title: "Marcado" });

                await favorito.POST(pedidoFavorito(criado.id, cookieLeitor, "POST"), params(criado.id));

                const biblioteca = await (await zines.GET(pedidoLista(cookieLeitor, "?scope=public"))).json();
                const lista = await (await zines.GET(pedidoLista(cookieLeitor, "?scope=favorites"))).json();

                assert.equal(biblioteca.zines.find((z) => z.id === criado.id).favorited, true);
                assert.deepEqual(lista.zines.map((z) => z.id), [criado.id]);
        });

        test("o favorito e por pessoa: o do leitor nao aparece para o dono", async () => {
                const criado = await criarZine({ title: "Individual" });

                await favorito.POST(pedidoFavorito(criado.id, cookieLeitor, "POST"), params(criado.id));

                const doDono = await (await zines.GET(pedidoLista(cookieDono))).json();

                assert.equal(doDono.zines.find((z) => z.id === criado.id).favorited, false);
        });

        test("desfavoritar remove da lista e e idempotente", async () => {
                const criado = await criarZine({ title: "Desfavoritavel" });

                await favorito.POST(pedidoFavorito(criado.id, cookieLeitor, "POST"), params(criado.id));

                const primeira = await favorito.DELETE(pedidoFavorito(criado.id, cookieLeitor, "DELETE"), params(criado.id));
                const segunda = await favorito.DELETE(pedidoFavorito(criado.id, cookieLeitor, "DELETE"), params(criado.id));

                assert.equal(primeira.status, 204);
                assert.equal(segunda.status, 204, "desfavoritar o que nao estava favoritado nao e erro");

                const lista = await (await zines.GET(pedidoLista(cookieLeitor, "?scope=favorites"))).json();

                assert.equal(lista.zines.some((z) => z.id === criado.id), false);
        });

        test("CRITERIO: nao da para favoritar zine privado de outra pessoa", async () => {
                const criado = await criarZine({ title: "Particular", visibility: "private" });

                const response = await favorito.POST(pedidoFavorito(criado.id, cookieLeitor, "POST"), params(criado.id));

                assert.equal(response.status, 404, "o favorito nao pode revelar zine privado");
                assert.equal(await db.favorite.count({ where: { zineId: criado.id } }), 0);
        });

        test("favorito de zine que virou privado sai da lista", async () => {
                const criado = await criarZine({ title: "Muda de ideia" });

                await favorito.POST(pedidoFavorito(criado.id, cookieLeitor, "POST"), params(criado.id));

                await detalhe.PATCH(
                        new Request(`${BASE}/api/zines/${criado.id}`, {
                                method: "PATCH",
                                headers: {
                                        "content-type": "application/json",
                                        host: "localhost:3000",
                                        cookie: cookieDono,
                                },
                                body: JSON.stringify({ visibility: "private" }),
                        }),
                        params(criado.id)
                );

                const lista = await (await zines.GET(pedidoLista(cookieLeitor, "?scope=favorites"))).json();

                assert.equal(lista.zines.some((z) => z.id === criado.id), false, "privar o zine tira o favorito da vista");
        });

        test("scope=favorites sem sessao responde 401", async () => {
                const response = await zines.GET(pedidoLista(null, "?scope=favorites"));

                assert.equal(response.status, 401);
        });

        test("CRITERIO: autor troca a visibilidade; usuario comum nao", async () => {
                const criado = await criarZine({ title: "Alternavel" });

                const peloLeitor = await detalhe.PATCH(
                        new Request(`${BASE}/api/zines/${criado.id}`, {
                                method: "PATCH",
                                headers: {
                                        "content-type": "application/json",
                                        host: "localhost:3000",
                                        cookie: cookieLeitor,
                                },
                                body: JSON.stringify({ visibility: "private" }),
                        }),
                        params(criado.id)
                );

                assert.equal(peloLeitor.status, 404, "editar zine alheio nao e permitido");

                const peloDono = await detalhe.PATCH(
                        new Request(`${BASE}/api/zines/${criado.id}`, {
                                method: "PATCH",
                                headers: {
                                        "content-type": "application/json",
                                        host: "localhost:3000",
                                        cookie: cookieDono,
                                },
                                body: JSON.stringify({ visibility: "private" }),
                        }),
                        params(criado.id)
                );

                assert.equal(peloDono.status, 200);
                assert.equal((await peloDono.json()).zine.visibility, "private");
        });

        test("zine de outro dono nao pode ser editado nem apagado", async () => {
                const criado = await criarZine({ title: "Alheio" });

                const apagar = await detalhe.DELETE(
                        pedidoFavorito(criado.id, cookieLeitor, "DELETE"),
                        params(criado.id)
                );

                assert.equal(apagar.status, 404);
                assert.notEqual(await db.zine.findUnique({ where: { id: criado.id } }), null);
        });
}

// Declarado por ultimo de proposito: um teste no escopo raiz antes dos hooks faz o
// `after` do escopo rodar assim que o `before` termina, apagando os usuarios que
// ele acabou de criar.
test("favoritar sem sessao responde 401", async () => {
        const response = await favorito.POST(pedidoFavorito("x", null, "POST"), params("x"));

        assert.equal(response.status, 401);
});
