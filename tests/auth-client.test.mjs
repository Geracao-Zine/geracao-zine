import { test } from "node:test";
import assert from "node:assert/strict";

const {
	LOGIN_TIMEOUT_MS,
	SESSION_INICIAL,
	buscarConfig,
	buscarSessao,
	entrarComCode,
	mensagemDeErro,
	sair,
} = await import("../src/lib/auth/client.ts");

const usuario = {
	id: "u-1",
	email: "poeta@exemplo.com",
	name: "Poeta",
	avatarUrl: "https://exemplo.com/a.png",
	emailVerified: true,
};

function resposta(corpo, status = 200) {
	// 204 nao pode carregar corpo; o construtor do Response recusa.
	if (status === 204) {
		return new Response(null, { status });
	}

	return new Response(JSON.stringify(corpo), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function espiao(resultado) {
	const chamadas = [];
	const fetcher = async (url, init) => {
		chamadas.push({ url, init });
		if (resultado instanceof Error) {
			throw resultado;
		}
		return resultado;
	};

	return { fetcher, chamadas };
}

test("o estado inicial e carregando, nao anonimo", () => {
	// Se comecasse em anonimo, a tela piscaria "Entrar" para quem ja tem sessao.
	assert.deepEqual(SESSION_INICIAL, { status: "carregando" });
});

test("buscarSessao devolve o usuario autenticado", async () => {
	const { fetcher, chamadas } = espiao(resposta({ user: usuario }));

	const estado = await buscarSessao(fetcher);

	assert.deepEqual(estado, { status: "autenticado", user: usuario });
	assert.equal(chamadas[0].url, "/api/auth/me");
	assert.equal(chamadas[0].init.credentials, "same-origin");
});

test("buscarSessao trata 401 como anonimo", async () => {
	const { fetcher } = espiao(resposta({ error: "nao_autenticado" }, 401));

	assert.deepEqual(await buscarSessao(fetcher), { status: "anonimo" });
});

test("buscarSessao sobrevive a falha de rede", async () => {
	const { fetcher } = espiao(new TypeError("fetch failed"));

	assert.deepEqual(await buscarSessao(fetcher), { status: "anonimo" });
});

test("buscarSessao nao confia em corpo sem id ou email", async () => {
	const casos = [
		{ user: {} },
		{ user: { id: "u-1" } },
		{ user: { email: "a@b.com" } },
		{ user: null },
		{},
		null,
	];

	for (const corpo of casos) {
		const { fetcher } = espiao(resposta(corpo));
		assert.deepEqual(await buscarSessao(fetcher), { status: "anonimo" });
	}
});

test("buscarSessao normaliza campos opcionais ausentes", async () => {
	const { fetcher } = espiao(resposta({ user: { id: "u-2", email: "x@y.com" } }));

	const estado = await buscarSessao(fetcher);

	assert.equal(estado.status, "autenticado");
	assert.equal(estado.user.name, null);
	assert.equal(estado.user.avatarUrl, null);
	assert.equal(estado.user.emailVerified, false);
});

test("entrarComCode envia o code em POST e devolve o usuario", async () => {
	const { fetcher, chamadas } = espiao(resposta({ user: usuario }));

	const resultado = await entrarComCode("code-123", fetcher);

	assert.deepEqual(resultado, { ok: true, user: usuario });
	assert.equal(chamadas[0].url, "/api/auth/google");
	assert.equal(chamadas[0].init.method, "POST");
	assert.deepEqual(JSON.parse(chamadas[0].init.body), { code: "code-123" });
});

test("entrarComCode traduz o erro do servidor para texto legivel", async () => {
	const { fetcher } = espiao(resposta({ error: "origem_invalida" }, 403));

	const resultado = await entrarComCode("code-123", fetcher);

	assert.equal(resultado.ok, false);
	assert.equal(resultado.motivo, mensagemDeErro("origem_invalida"));
	// A mensagem crua do servidor nunca vaza para a tela.
	assert.ok(!resultado.motivo.includes("origem_invalida"));
});

test("entrarComCode usa mensagem generica para codigo desconhecido", async () => {
	const { fetcher } = espiao(resposta({ error: "algo_novo" }, 500));

	const resultado = await entrarComCode("code-123", fetcher);

	assert.equal(resultado.ok, false);
	assert.equal(resultado.motivo, mensagemDeErro("falha_no_login"));
});

test("entrarComCode informa falta de conexao", async () => {
	const { fetcher } = espiao(new TypeError("fetch failed"));

	const resultado = await entrarComCode("code-123", fetcher);

	assert.equal(resultado.ok, false);
	assert.match(resultado.motivo, /conexao/i);
});

test("entrarComCode recusa sucesso sem usuario valido", async () => {
	const { fetcher } = espiao(resposta({ user: { id: "u-1" } }));

	const resultado = await entrarComCode("code-123", fetcher);

	assert.equal(resultado.ok, false);
});

test("mensagemDeErro cobre os codigos que o servidor devolve", () => {
	const generica = mensagemDeErro("falha_no_login");

	for (const codigo of ["code_ausente", "origem_invalida", "json_invalido"]) {
		assert.notEqual(mensagemDeErro(codigo), generica, `${codigo} deveria ter texto proprio`);
	}

	// Codigo desconhecido cai na mensagem generica.
	assert.equal(mensagemDeErro("nao_existe"), generica);
});

test("buscarConfig devolve o client id publicado pelo servidor", async () => {
	const { fetcher, chamadas } = espiao(
		resposta({ googleClientId: "abc.apps.googleusercontent.com" }),
	);

	const config = await buscarConfig(fetcher);

	assert.deepEqual(config, { googleClientId: "abc.apps.googleusercontent.com" });
	assert.equal(chamadas[0].url, "/api/auth/config");
});

test("buscarConfig devolve null quando o servidor nao tem a variavel", async () => {
	const { fetcher } = espiao(resposta({ googleClientId: null }));

	assert.deepEqual(await buscarConfig(fetcher), { googleClientId: null });
});

test("buscarConfig devolve null para valores vazios ou invalidos", async () => {
	for (const corpo of [{ googleClientId: "" }, { googleClientId: 42 }, {}, null]) {
		const { fetcher } = espiao(resposta(corpo));
		assert.deepEqual(await buscarConfig(fetcher), { googleClientId: null });
	}
});

test("buscarConfig sobrevive a falha de rede", async () => {
	const { fetcher } = espiao(new TypeError("fetch failed"));

	assert.deepEqual(await buscarConfig(fetcher), { googleClientId: null });
});

test("sair chama o logout com POST e same-origin", async () => {
	const { fetcher, chamadas } = espiao(resposta({}, 204));

	await sair(fetcher);

	assert.equal(chamadas[0].url, "/api/auth/logout");
	assert.equal(chamadas[0].init.method, "POST");
	assert.equal(chamadas[0].init.credentials, "same-origin");
});

test("sair nao propaga erro de rede", async () => {
	const { fetcher } = espiao(new TypeError("fetch failed"));

	await assert.doesNotReject(() => sair(fetcher));
});

// Requisicao que so termina quando o signal aborta, como um fetch de verdade
// que nao recebe resposta. Sem prazo no cliente, o teste ficaria pendurado.
function semResposta() {
	return (_url, init) =>
		new Promise((_, rejeitar) => {
			const sinal = init?.signal;

			if (!sinal) {
				rejeitar(new Error("o cliente nao passou signal: penduraria para sempre"));
				return;
			}

			sinal.addEventListener("abort", () => {
				rejeitar(Object.assign(new Error("aborted"), { name: "AbortError" }));
			});
		});
}

test("entrarComCode manda um sinal de cancelamento com prazo", async () => {
	const { fetcher, chamadas } = espiao(resposta({ user: usuario }));

	await entrarComCode("code-123", fetcher);

	const { signal } = chamadas[0].init;
	assert.ok(signal instanceof AbortSignal, "sem signal o fetch pode pendurar para sempre");
	assert.equal(signal.aborted, false);
});

test("o prazo do login e finito e curto o bastante", () => {
	assert.equal(typeof LOGIN_TIMEOUT_MS, "number");
	assert.ok(Number.isFinite(LOGIN_TIMEOUT_MS) && LOGIN_TIMEOUT_MS > 0);
});

test("entrarComCode distingue timeout de queda de rede", async () => {
	const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
	const { fetcher } = espiao(timeout);

	const resultado = await entrarComCode("code-123", fetcher);

	assert.equal(resultado.ok, false);
	assert.match(resultado.motivo, /demorou/i);
});

test("as chamadas de sessao tambem tem prazo", async () => {
	for (const [nome, fn, esperado] of [
		["buscarSessao", buscarSessao, { status: "anonimo" }],
		["buscarConfig", buscarConfig, { googleClientId: null }],
	]) {
		const { fetcher, chamadas } = espiao(resposta({}));

		await fn(fetcher);

		assert.ok(chamadas[0].init.signal instanceof AbortSignal, `${nome} precisa de signal`);
		assert.deepEqual(await fn(semResposta()), esperado);
	}
});

test("sair manda sinal com prazo", async () => {
	const { fetcher, chamadas } = espiao(resposta({}, 204));

	await sair(fetcher);

	assert.ok(chamadas[0].init.signal instanceof AbortSignal);
});

test("um fetch abortado por prazo vira mensagem, nao excecao", async () => {
	const { fetcher } = espiao(Object.assign(new Error("aborted"), { name: "AbortError" }));

	await assert.doesNotReject(async () => {
		const r = await entrarComCode("code-123", fetcher);
		assert.equal(r.ok, false);
		assert.match(r.motivo, /demorou/i);
	});
});

test("sem AbortSignal.timeout o login ainda funciona, so sem prazo", async () => {
	const original = AbortSignal.timeout;
	AbortSignal.timeout = undefined;

	try {
		const { fetcher, chamadas } = espiao(resposta({ user: usuario }));

		const resultado = await entrarComCode("code-123", fetcher);

		assert.deepEqual(resultado, { ok: true, user: usuario });
		// Sem a API, o init nao leva signal: melhor sem prazo do que sem login.
		assert.equal(chamadas[0].init.signal, undefined);
	} finally {
		AbortSignal.timeout = original;
	}
});
