import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const {
	GIS_SRC,
	carregarGis,
	gisDisponivel,
	interpretarResposta,
	prepararLogin,
	reiniciarGis,
} = await import("../src/lib/auth/gis.ts");

function aleatorioFixo(valor) {
	return (bytes) => new Uint8Array(bytes).fill(valor);
}

// Documento minimo que imita o suficiente de `document` para o carregador.
function documentoFalso() {
	const listeners = new Map();
	const criados = [];

	const script = () => {
		const el = {
			src: "",
			async: false,
			defer: false,
			addEventListener: (tipo, fn) => {
				listeners.set(tipo, fn);
			},
			disparar: (tipo) => listeners.get(tipo)?.(),
		};
		criados.push(el);
		return el;
	};

	const doc = {
		head: {
			appendChild: () => undefined,
		},
		defaultView: {},
		querySelector: () => null,
		createElement: () => script(),
	};

	return { doc, criados, listeners };
}

beforeEach(() => {
	reiniciarGis();
});

test("gisDisponivel e falso sem o script carregado", () => {
	assert.equal(gisDisponivel(undefined), false);
	assert.equal(gisDisponivel({}), false);
	assert.equal(gisDisponivel({ google: {} }), false);
	assert.equal(gisDisponivel({ google: { accounts: { oauth2: {} } } }), false);
});

test("gisDisponivel e verdadeiro quando initCodeClient existe", () => {
	const janela = {
		google: { accounts: { oauth2: { initCodeClient: () => ({}) } } },
	};

	assert.equal(gisDisponivel(janela), true);
});

test("carregarGis reaproveita o script ja presente", async () => {
	const janela = {
		google: { accounts: { oauth2: { initCodeClient: () => ({}) } } },
	};
	const doc = { defaultView: janela };

	const accounts = await carregarGis(doc);

	assert.equal(typeof accounts.oauth2.initCodeClient, "function");
});

test("carregarGis rejeita quando o script falha", async () => {
	const { doc, criados } = documentoFalso();

	const promessa = carregarGis(doc);

	// O script e inserido de forma assincrona; disparar o erro depois do registro.
	await Promise.resolve();
	criados[0].disparar("error");

	await assert.rejects(promessa, /falha ao carregar/);
});

test("carregarGis resolve quando o script carrega e publica o google", async () => {
	const { doc, criados } = documentoFalso();

	const promessa = carregarGis(doc);

	await Promise.resolve();
	doc.defaultView.google = { accounts: { oauth2: { initCodeClient: () => ({}) } } };
	criados[0].disparar("load");

	const accounts = await promessa;

	assert.equal(typeof accounts.oauth2.initCodeClient, "function");
});

test("interpretarResposta aceita code com state conferindo", () => {
	const resultado = interpretarResposta({ code: "abc", state: "s1" }, "s1");

	assert.deepEqual(resultado, { ok: true, code: "abc" });
});

test("interpretarResposta aceita code sem state ecoado", () => {
	const resultado = interpretarResposta({ code: "abc" }, "s1");

	assert.deepEqual(resultado, { ok: true, code: "abc" });
});

test("interpretarResposta recusa state divergente", () => {
	const resultado = interpretarResposta({ code: "abc", state: "outro" }, "s1");

	assert.equal(resultado.ok, false);
	assert.match(resultado.motivo, /inesperada/);
});

test("interpretarResposta traduz popup fechado", () => {
	const resultado = interpretarResposta({ error: "popup_closed" }, "s1");

	assert.equal(resultado.ok, false);
	assert.match(resultado.motivo, /fechada/);
});

test("interpretarResposta traduz acesso negado", () => {
	const resultado = interpretarResposta({ error: "access_denied" }, "s1");

	assert.equal(resultado.ok, false);
	assert.match(resultado.motivo, /negado/);
});

test("interpretarResposta recusa code vazio ou ausente", () => {
	for (const resposta of [{}, { code: "" }, { code: undefined, state: "s1" }]) {
		const resultado = interpretarResposta(resposta, "s1");
		assert.equal(resultado.ok, false);
	}
});

test("prepararLogin entrega o resultado ja interpretado ao chamador", async () => {
	let config = null;
	const janela = {
		google: {
			accounts: {
				oauth2: {
					initCodeClient: (c) => {
						config = c;
						return { requestCode: () => undefined };
					},
				},
			},
		},
	};

	const recebidos = [];
	const pedido = await prepararLogin({
		clientId: "cliente-1",
		aleatorio: aleatorioFixo(5),
		aoResponder: (r) => recebidos.push(r),
		documento: { defaultView: janela },
	});

	assert.equal(config.client_id, "cliente-1");
	assert.equal(config.ux_mode, "popup");
	assert.equal(config.state, pedido.state);

	config.callback({ code: "abc", state: pedido.state });

	assert.deepEqual(recebidos[0], { ok: true, code: "abc" });
});

test("prepararLogin reporta popup fechado pelo error_callback", async () => {
	let config = null;
	const janela = {
		google: {
			accounts: {
				oauth2: {
					initCodeClient: (c) => {
						config = c;
						return { requestCode: () => undefined };
					},
				},
			},
		},
	};

	const recebidos = [];
	await prepararLogin({
		clientId: "cliente-1",
		aleatorio: aleatorioFixo(5),
		aoResponder: (r) => recebidos.push(r),
		documento: { defaultView: janela },
	});

	config.error_callback({ type: "popup_closed" });

	assert.equal(recebidos[0].ok, false);
	assert.match(recebidos[0].motivo, /fechada/);
});

test("a URL do script e a oficial do Google", () => {
	assert.equal(GIS_SRC, "https://accounts.google.com/gsi/client");
});
