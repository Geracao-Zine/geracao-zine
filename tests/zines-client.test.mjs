import assert from "node:assert/strict";
import { test } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";

const { criarZineNaConta, atualizarZineNaConta, listarZinesDaConta, draftDoZine, podeSalvar, mensagemDeErro, MENSAGEM_FALHA_GENERICA } =
	await import("../src/lib/zines/client.ts");
const { createDraft } = await import("../src/domain/index.ts");

function rascunhoComTitulo(title = "Meu Zine") {
	const draft = createDraft();
	return { ...draft, cover: { ...draft.cover, title } };
}

function resposta(corpo, status = 200) {
	return new Response(JSON.stringify(corpo), {
		status,
		headers: { "content-type": "application/json" },
	});
}

const ZINE_OK = {
	zine: {
		id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
		title: "Meu Zine",
		visibility: "private",
		content: { version: 1 },
		contentVersion: 1,
		slug: null,
		updatedAt: "2026-11-19T10:00:00.000Z",
	},
};

function fetcherFalso(handler) {
	const chamadas = [];

	return {
		chamadas,
		fetch: async (url, init) => {
			chamadas.push({ url, init });
			return handler(url, init);
		},
	};
}

test("criar manda titulo, conteudo e versao, sem ownerId", async () => {
	const { fetch, chamadas } = fetcherFalso(() => resposta(ZINE_OK, 201));
	const resultado = await criarZineNaConta(rascunhoComTitulo(), fetch);

	assert.equal(resultado.ok, true);
	assert.equal(chamadas[0].url, "/api/zines");
	assert.equal(chamadas[0].init.method, "POST");

	const corpo = JSON.parse(chamadas[0].init.body);

	assert.equal(corpo.title, "Meu Zine");
	assert.equal("ownerId" in corpo, false, "o dono vem da sessao, nunca do corpo");
	assert.equal(corpo.contentVersion, 1);
});

test("a etapa do editor nao vai para a conta", async () => {
	const { fetch, chamadas } = fetcherFalso(() => resposta(ZINE_OK, 201));
	const draft = { ...rascunhoComTitulo(), step: "print" };

	await criarZineNaConta(draft, fetch);

	const corpo = JSON.parse(chamadas[0].init.body);

	assert.equal(corpo.content.step, "cover", "abrir em outro dispositivo nao pode cair na etapa de impressao");
});

test("atualizar usa PATCH no id do zine", async () => {
	const id = ZINE_OK.zine.id;
	const { fetch, chamadas } = fetcherFalso(() => resposta(ZINE_OK));

	const resultado = await atualizarZineNaConta(id, rascunhoComTitulo("Novo"), fetch);

	assert.equal(resultado.ok, true);
	assert.equal(chamadas[0].url, `/api/zines/${id}`);
	assert.equal(chamadas[0].init.method, "PATCH");
	assert.equal(JSON.parse(chamadas[0].init.body).title, "Novo");
});

test("401 vira mensagem de sessao expirada", async () => {
	const { fetch } = fetcherFalso(() => resposta({ error: "nao_autenticado" }, 401));
	const resultado = await criarZineNaConta(rascunhoComTitulo(), fetch);

	assert.equal(resultado.ok, false);
	assert.match(resultado.motivo, /sessao expirou/i);
});

test("codigo desconhecido cai na mensagem generica", async () => {
	const { fetch } = fetcherFalso(() => resposta({ error: "algo_novo" }, 500));
	const resultado = await criarZineNaConta(rascunhoComTitulo(), fetch);

	assert.equal(resultado.ok, false);
	assert.equal(resultado.motivo, MENSAGEM_FALHA_GENERICA);
});

test("CRITERIO: falha de rede nao lanca e devolve motivo", async () => {
	const { fetch } = fetcherFalso(() => {
		throw new TypeError("fetch failed");
	});
	const resultado = await criarZineNaConta(rascunhoComTitulo(), fetch);

	assert.equal(resultado.ok, false);
	assert.equal(resultado.motivo, MENSAGEM_FALHA_GENERICA);
});

test("resposta 200 com corpo estranho nao e tratada como sucesso", async () => {
	const { fetch } = fetcherFalso(() => resposta({ nada: true }));
	const resultado = await criarZineNaConta(rascunhoComTitulo(), fetch);

	assert.equal(resultado.ok, false);
});

test("corpo de erro sem JSON nao quebra o mapeamento", async () => {
	const { fetch } = fetcherFalso(() => new Response("<html>erro</html>", { status: 500 }));
	const resultado = await criarZineNaConta(rascunhoComTitulo(), fetch);

	assert.equal(resultado.ok, false);
	assert.equal(resultado.motivo, MENSAGEM_FALHA_GENERICA);
});

test("listar devolve os zines da conta", async () => {
	const { fetch, chamadas } = fetcherFalso(() => resposta({ zines: [ZINE_OK.zine] }));
	const zines = await listarZinesDaConta(fetch);

	assert.equal(chamadas[0].url, "/api/zines");
	assert.equal(zines.length, 1);
	assert.equal(zines[0].id, ZINE_OK.zine.id);
});

test("listar devolve vazio em qualquer falha", async () => {
	for (const handler of [
		() => resposta({}, 401),
		() => resposta({ zines: "nao-e-lista" }),
		() => {
			throw new Error("rede");
		},
	]) {
		const { fetch } = fetcherFalso(handler);

		assert.deepEqual(await listarZinesDaConta(fetch), []);
	}
});

test("draftDoZine reconstroi o rascunho pelo parser do dominio", () => {
	const draft = rascunhoComTitulo("Volta do Servidor");
	const zine = { ...ZINE_OK.zine, content: JSON.parse(JSON.stringify(draft)) };
	const volta = draftDoZine(zine);

	assert.ok(volta);
	assert.equal(volta.cover.title, "Volta do Servidor");
});

test("draftDoZine preenche campo faltando com o padrao, sem descartar o resto", () => {
	// Objeto de uma versao anterior: tem titulo, nao tem `doc` nem `format`.
	const volta = draftDoZine({ ...ZINE_OK.zine, content: { cover: { title: "Antigo" } } });

	assert.ok(volta);
	assert.equal(volta.cover.title, "Antigo");
	assert.equal(volta.cover.author, "");
	assert.ok(Array.isArray(volta.doc.pages), "o documento precisa sair utilizavel");
});

test("draftDoZine devolve null quando nao ha conteudo nenhum", () => {
	// Sem conteudo nao ha o que restaurar: quem chama decide o que fazer,
	// em vez de receber um rascunho vazio se passando por zine salvo.
	assert.equal(draftDoZine({ ...ZINE_OK.zine, content: null }), null);
});

test("podeSalvar exige titulo", () => {
	assert.equal(podeSalvar(rascunhoComTitulo("Tem titulo")), true);
	assert.equal(podeSalvar(rascunhoComTitulo("   ")), false);
	assert.equal(podeSalvar(rascunhoComTitulo("")), false);
});

test("mensagemDeErro cobre os codigos que a API de zines devolve", () => {
	for (const codigo of ["nao_autenticado", "titulo_ausente", "zine_nao_encontrado", "origem_invalida"]) {
		assert.notEqual(mensagemDeErro(codigo), MENSAGEM_FALHA_GENERICA, codigo);
	}
});

test("atualizar cria um novo quando o zine sumiu da conta", async () => {
        // Zine apagado em outra aba: insistir no PATCH deixaria o editor em erro
        // para sempre. A gravacao precisa virar um zine novo.
        let chamada = 0;
        const { fetch, chamadas } = fetcherFalso(() => {
                chamada += 1;

                return chamada === 1
                        ? resposta({ error: "zine_nao_encontrado" }, 404)
                        : resposta(ZINE_OK, 201);
        });

        const resultado = await atualizarZineNaConta("3f2504e0-4f89-11d3-9a0c-0305e82c3301", rascunhoComTitulo(), fetch);

        assert.equal(resultado.ok, true);
        assert.deepEqual(
                chamadas.map((c) => c.init.method),
                ["PATCH", "POST"],
                "o POST so pode acontecer depois do 404"
        );
        assert.equal(chamadas[1].url, "/api/zines");
});

test("atualizar mantem o erro quando a falha nao e zine ausente", async () => {
        const { fetch, chamadas } = fetcherFalso(() => resposta({ error: "titulo_ausente" }, 400));
        const resultado = await atualizarZineNaConta("3f2504e0-4f89-11d3-9a0c-0305e82c3301", rascunhoComTitulo(), fetch);

        assert.equal(resultado.ok, false);
        assert.equal(chamadas.length, 1, "erro de conteudo nao pode virar zine novo");
});
