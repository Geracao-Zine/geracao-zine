import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";

const rotas = await import("../src/app/api/zines/route.ts");
const detalhe = await import("../src/app/api/zines/[id]/route.ts");
const { SESSION_COOKIE, signSessionToken } = await import("../src/lib/session.ts");
const { criarZineNaConta, atualizarZineNaConta, listarZinesDaConta, draftDoZine, podeSalvar } = await import(
	"../src/lib/zines/client.ts"
);
const { createDraft, poemPages } = await import("../src/domain/index.ts");

const DATABASE_URL = process.env.DATABASE_URL;
const semBanco = !DATABASE_URL;
const BASE = "http://localhost:3000";

function rascunho(title = "Meu Zine", corpo = "primeiro verso") {
	const draft = createDraft();

	return {
		...draft,
		cover: { ...draft.cover, title, author: "Autora" },
		doc: {
			...draft.doc,
			pages: [
				{ id: "p1", kind: "poem", title: "Poema", subtitle: "", date: "", body: corpo, blocks: [] },
			],
		},
	};
}

if (semBanco) {
	test("salvar na conta com banco (pulada: DATABASE_URL ausente)", { skip: true }, () => {});
} else {
	const { PrismaPg } = await import("@prisma/adapter-pg");
	const { PrismaClient } = await import("../src/generated/prisma/client.ts");

	const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
	const EMAIL = "conta@teste-salvar.local";
	let cookie;
	let userId;

	// O navegador nao existe aqui: o "navegador" e o proprio cliente HTTP,
	// chamando as rotas reais com o cookie de sessao.
	const fetchDoNavegador = (url, init) => {
		const caminho = new URL(url, BASE).pathname;
		const comCookie = { ...init, headers: { ...(init?.headers ?? {}), cookie } };

		if (caminho === "/api/zines" && init?.method === "POST") {
			return rotas.POST(new Request(`${BASE}${caminho}`, comCookie));
		}

		if (caminho === "/api/zines") {
			return rotas.GET(new Request(`${BASE}${caminho}`, comCookie));
		}

		const id = caminho.split("/").pop();

		if (init?.method === "PATCH") {
			return detalhe.PATCH(new Request(`${BASE}${caminho}`, comCookie), {
				params: Promise.resolve({ id }),
			});
		}

		return detalhe.GET(new Request(`${BASE}${caminho}`, comCookie), {
			params: Promise.resolve({ id }),
		});
	};

	before(async () => {
		await db.user.deleteMany({ where: { email: EMAIL } });

		const user = await db.user.create({ data: { email: EMAIL, name: "Autora", googleId: `sub-${EMAIL}` } });

		userId = user.id;
		cookie = `${SESSION_COOKIE}=${await signSessionToken({ userId: user.id, email: EMAIL })}`;
	});

	beforeEach(async () => {
		await db.zine.deleteMany({ where: { ownerId: userId } });
	});

	after(async () => {
		await db.zine.deleteMany({ where: { ownerId: userId } });
		await db.user.deleteMany({ where: { email: EMAIL } });
		await db.$disconnect();
	});

	test("CRITERIO: zine salvo na conta aparece em outro navegador apos login", async () => {
		const original = rascunho("Zine de outro navegador", "texto que nao pode se perder");

		const salvo = await criarZineNaConta(original, fetchDoNavegador);

		assert.equal(salvo.ok, true, salvo.ok ? "" : salvo.motivo);

		// Outro navegador: localStorage vazio, mesma conta. Le a lista da
		// conta e reconstroi o rascunho do conteudo que veio do servidor.
		const lista = await listarZinesDaConta(fetchDoNavegador);

		assert.equal(lista.length, 1);

		const restaurado = draftDoZine(lista[0]);

		assert.ok(restaurado);
		assert.equal(restaurado.cover.title, "Zine de outro navegador");
		const poemas = poemPages(restaurado.doc);

		assert.equal(poemas.length, 1);
		assert.equal(poemas[0].body, "texto que nao pode se perder");
	});

	test("CRITERIO: anonimo nao perde o rascunho ao nao estar logado", async () => {
		// Sem cookie: a API recusa, e o cliente devolve erro em vez de lancar.
		// Quem chama mantem o rascunho local; nada aqui apaga o texto.
		const semSessao = (url, init) => {
			const caminho = new URL(url, BASE).pathname;

			return rotas.POST(
				new Request(`${BASE}${caminho}`, { ...init, headers: { ...(init?.headers ?? {}) } })
			);
		};

		const resultado = await criarZineNaConta(rascunho("Anonimo"), semSessao);

		assert.equal(resultado.ok, false, "anonimo nao tem conta para salvar");
		assert.match(resultado.motivo, /entre de novo|sessao/i);
		assert.equal(await db.zine.count({ where: { ownerId: userId } }), 0);
	});

	test("CRITERIO: falha de rede nao descarta o conteudo local", async () => {
		const draft = rascunho("Sobrevive a queda");

		const resultado = await criarZineNaConta(draft, () => {
			throw new TypeError("fetch failed");
		});

		assert.equal(resultado.ok, false);
		// O rascunho passado continua intacto: o cliente nao muta o objeto.
		assert.equal(draft.cover.title, "Sobrevive a queda");
		assert.equal(draft.doc.pages[0].body, "primeiro verso");
	});

	test("segundo salvamento atualiza o mesmo zine, sem criar outro", async () => {
		const primeiro = await criarZineNaConta(rascunho("Versao 1"), fetchDoNavegador);

		assert.equal(primeiro.ok, true);

		const id = primeiro.zine.id;
		const segundo = await atualizarZineNaConta(id, rascunho("Versao 2"), fetchDoNavegador);

		assert.equal(segundo.ok, true);
		assert.equal(segundo.zine.id, id, "atualizar nao pode criar um zine novo");
		assert.equal(await db.zine.count({ where: { ownerId: userId } }), 1);
		assert.equal(segundo.zine.title, "Versao 2");
	});

	test("o conteudo gravado traz o documento inteiro", async () => {
		const salvo = await criarZineNaConta(rascunho("Completo"), fetchDoNavegador);

		assert.equal(salvo.ok, true);

		const gravado = await db.zine.findUniqueOrThrow({ where: { id: salvo.zine.id } });
		const conteudo = gravado.content;

		assert.equal(conteudo.cover.title, "Completo");
		assert.equal(conteudo.doc.pages[0].body, "primeiro verso");
		assert.equal(gravado.contentVersion, 1);
		assert.equal(gravado.visibility, "private", "salvar na conta nao publica");
	});

	test("zine sem titulo nao vai para a conta", async () => {
		const draft = rascunho("");

		assert.equal(podeSalvar(draft), false);

		// Mesmo forcando, o cliente usa um titulo provisorio em vez de falhar
		// com 400: o rascunho nao pode ficar preso no navegador por isso.
		const salvo = await criarZineNaConta(draft, fetchDoNavegador);

		assert.equal(salvo.ok, true);
		assert.equal(salvo.zine.title, "Zine sem titulo");
	});

	test("salvar duas vezes seguidas nao duplica o zine da conta", async () => {
		const draft = rascunho("Sem duplicar");
		const primeiro = await criarZineNaConta(draft, fetchDoNavegador);

		assert.equal(primeiro.ok, true);

		await atualizarZineNaConta(primeiro.zine.id, draft, fetchDoNavegador);
		await atualizarZineNaConta(primeiro.zine.id, draft, fetchDoNavegador);

		assert.equal(await db.zine.count({ where: { ownerId: userId } }), 1);
	});
}
