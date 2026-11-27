import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const {
	FalhaGis,
	GIS_SRC,
	GIS_TIMEOUT_MS,
	carregarGis,
	gisDisponivel,
	interpretarResposta,
	mensagemDeFalhaGis,
	prepararLogin,
	reiniciarGis,
} = await import("../src/lib/auth/gis.ts");

function aleatorioFixo(valor) {
	return (bytes) => new Uint8Array(bytes).fill(valor);
}

// Documento minimo que imita o suficiente de `document` para o carregador.
// O registro de ouvintes aceita varios por tipo e sabe remove-los, porque o
// carregador limpa os ouvintes ao encerrar (timeout ou erro).
function documentoFalso({ existente = null } = {}) {
	const criados = [];

	const criarScript = (src = "") => {
		const ouvintes = new Map();

		const el = {
			src,
			async: false,
			defer: false,
			removido: false,
			addEventListener: (tipo, fn) => {
				if (!ouvintes.has(tipo)) ouvintes.set(tipo, []);
				ouvintes.get(tipo).push(fn);
			},
			removeEventListener: (tipo, fn) => {
				const lista = ouvintes.get(tipo) ?? [];
				const i = lista.indexOf(fn);
				if (i >= 0) lista.splice(i, 1);
			},
			remove: () => {
				el.removido = true;
			},
			disparar: (tipo) => {
				const lista = [...(ouvintes.get(tipo) ?? [])];
				for (const fn of lista) fn();
				return lista.length;
			},
		};

		return el;
	};

	const doc = {
		head: {
			appendChild: () => undefined,
		},
		defaultView: {},
		querySelector: () => existente,
		createElement: () => {
			const el = criarScript();
			criados.push(el);
			return el;
		},
	};

	return { doc, criados };
}

// Relogio que so anda quando o teste manda, para nao esperar 10s de verdade.
function relogioFalso() {
	const prazos = [];

	return {
		prazos,
		setTimeout: (fn, ms) => {
			const prazo = { fn, ms, cancelado: false };
			prazos.push(prazo);
			return prazo;
		},
		clearTimeout: (prazo) => {
			if (prazo) prazo.cancelado = true;
		},
		disparar: () => {
			const prazo = prazos.find((p) => !p.cancelado);

			if (!prazo) {
				throw new Error("nenhum prazo pendente para disparar");
			}

			prazo.cancelado = true;
			prazo.fn();
		},
	};
}

const googlePronto = () => ({ accounts: { oauth2: { initCodeClient: () => ({}) } } });

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
	const relogio = relogioFalso();

	const promessa = carregarGis(doc, { relogio });

	// O script e inserido de forma assincrona; disparar o erro depois do registro.
	await Promise.resolve();
	criados[0].disparar("error");

	await assert.rejects(promessa, /falha ao carregar/);
});

test("carregarGis resolve quando o script carrega e publica o google", async () => {
	const { doc, criados } = documentoFalso();
	const relogio = relogioFalso();

	const promessa = carregarGis(doc, { relogio });

	await Promise.resolve();
	doc.defaultView.google = googlePronto();
	criados[0].disparar("load");

	const accounts = await promessa;

	assert.equal(typeof accounts.oauth2.initCodeClient, "function");
});

test("carregarGis desiste quando o script nao responde a tempo", async () => {
	const { doc, criados } = documentoFalso();
	const relogio = relogioFalso();

	const promessa = carregarGis(doc, { relogio, timeoutMs: 1234 });

	await Promise.resolve();
	assert.equal(relogio.prazos[0].ms, 1234, "o prazo injetado precisa ser respeitado");

	relogio.disparar();

	await assert.rejects(promessa, (erro) => {
		assert.ok(erro instanceof FalhaGis);
		assert.equal(erro.motivo, "timeout");
		return true;
	});

	// O script que nao respondeu sai do DOM para a proxima tentativa pedir de novo.
	assert.equal(criados[0].removido, true);
});

test("o timeout tem um prazo padrao finito", () => {
	// Sem isso, um script bloqueado deixaria a promessa pendente para sempre.
	assert.equal(typeof GIS_TIMEOUT_MS, "number");
	assert.ok(GIS_TIMEOUT_MS > 0 && Number.isFinite(GIS_TIMEOUT_MS));
});

test("um load tardio depois do timeout nao executa mais nada", async () => {
	const { doc, criados } = documentoFalso();
	const relogio = relogioFalso();

	const promessa = carregarGis(doc, { relogio });

	await Promise.resolve();
	relogio.disparar();
	await assert.rejects(promessa, (erro) => erro.motivo === "timeout");

	doc.defaultView.google = googlePronto();

	// Resolver uma promessa ja rejeitada seria inofensivo, entao a garantia que
	// importa e o ouvinte ter saido: nada roda no load tardio.
	assert.equal(criados[0].disparar("load"), 0, "o ouvinte de load deveria ter sido removido");
	assert.equal(criados[0].disparar("error"), 0, "o ouvinte de error deveria ter sido removido");
});

test("depois de um timeout uma nova chamada tenta carregar de novo", async () => {
	const { doc, criados } = documentoFalso();
	const relogio = relogioFalso();

	const primeira = carregarGis(doc, { relogio });

	await Promise.resolve();
	relogio.disparar();
	await assert.rejects(primeira, (erro) => erro.motivo === "timeout");

	// A promessa memorizada foi liberada; sem isso o botao ficaria inerte ate
	// recarregar a pagina.
	const segunda = carregarGis(doc, { relogio });

	await Promise.resolve();
	assert.equal(criados.length, 2, "a segunda tentativa precisa criar outro script");

	doc.defaultView.google = googlePronto();
	criados[1].disparar("load");

	const accounts = await segunda;
	assert.equal(typeof accounts.oauth2.initCodeClient, "function");
});

test("o timeout e cancelado quando o script carrega a tempo", async () => {
	const { doc, criados } = documentoFalso();
	const relogio = relogioFalso();

	const promessa = carregarGis(doc, { relogio });

	await Promise.resolve();
	doc.defaultView.google = googlePronto();
	criados[0].disparar("load");
	await promessa;

	assert.equal(relogio.prazos[0].cancelado, true, "o prazo ficaria pendente a toa");
});

test("o script ja existente tambem respeita o timeout", async () => {
	let removido = false;
	const existente = {
		src: GIS_SRC,
		addEventListener: () => undefined,
		removeEventListener: () => undefined,
		remove: () => {
			removido = true;
		},
	};
	const { doc } = documentoFalso({ existente });
	const relogio = relogioFalso();

	const promessa = carregarGis(doc, { relogio });

	relogio.disparar();

	await assert.rejects(promessa, (erro) => erro.motivo === "timeout");
	// A tag nao foi criada aqui; remove-la apagaria o script de outra parte da pagina.
	assert.equal(removido, false, "nao remover um script que o carregador nao inseriu");
});

test("mensagemDeFalhaGis diferencia timeout de erro de script", () => {
	const doTimeout = mensagemDeFalhaGis(new FalhaGis("timeout", "x"));
	const doScript = mensagemDeFalhaGis(new FalhaGis("script", "x"));

	assert.match(doTimeout, /demorou/i);
	assert.notEqual(doTimeout, doScript);
	// Um erro desconhecido nao pode vazar texto tecnico para a tela.
	assert.equal(mensagemDeFalhaGis(new Error("boom")), doScript);
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
