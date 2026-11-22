import { test } from "node:test";
import assert from "node:assert/strict";

const { TAMANHO_STATE, criarState, stateConfere } = await import(
	"../src/lib/auth/state.ts"
);

const ALFABETO = /^[A-Za-z0-9]+$/;

function aleatorioFixo(valor) {
	return (bytes) => new Uint8Array(bytes).fill(valor);
}

test("criarState devolve o tamanho esperado e so caracteres seguros", () => {
	const state = criarState(aleatorioFixo(7));

	assert.equal(state.length, TAMANHO_STATE);
	assert.match(state, ALFABETO);
});

test("criarState usa a fonte aleatoria recebida", () => {
	const state = criarState((bytes) => {
		const saida = new Uint8Array(bytes);
		for (let i = 0; i < bytes; i += 1) {
			saida[i] = i;
		}
		return saida;
	});

	assert.equal(new Set(state).size, state.length, "caracteres deveriam variar");
});

test("criarState recusa fonte que devolve menos bytes", () => {
	assert.throws(() => criarState(() => new Uint8Array(4)), /menos bytes/);
});

test("criarState descarta bytes altos para nao enviesar o alfabeto", () => {
	// 255 fica acima do limite (62*4=248) e e descartado. Se nada sobrar, a
	// funcao recusa em vez de devolver um state mais curto que o prometido.
	assert.throws(() => criarState((bytes) => new Uint8Array(bytes).fill(255)), /insuficiente/);
});

test("criarState aproveita os bytes abaixo do limite", () => {
	// 248 e o primeiro valor descartado; 247 ainda entra no alfabeto.
	const state = criarState((bytes) => new Uint8Array(bytes).fill(247));

	assert.equal(state.length, TAMANHO_STATE);
	assert.match(state, ALFABETO);
});

test("stateConfere aceita valores iguais", () => {
	assert.equal(stateConfere("abc123", "abc123"), true);
});

test("stateConfere recusa valores diferentes", () => {
	assert.equal(stateConfere("abc123", "abc124"), false);
	assert.equal(stateConfere("abc123", "xbc123"), false);
});

test("stateConfere recusa tamanhos diferentes", () => {
	assert.equal(stateConfere("abc123", "abc12"), false);
	assert.equal(stateConfere("abc123", "abc1234"), false);
});

test("stateConfere aceita ausencia porque o popup pode nao ecoar o state", () => {
	// Documentado no modulo: o GIS recomenda state para o fluxo de redirect; no
	// popup o eco nao e garantido. Recusar a ausencia quebraria login legitimo.
	assert.equal(stateConfere("abc123", undefined), true);
	assert.equal(stateConfere("abc123", null), true);
	assert.equal(stateConfere("abc123", ""), true);
});

test("stateConfere nunca lanca para entradas estranhas", () => {
	for (const valor of [undefined, null, "", 0, {}, []]) {
		assert.doesNotThrow(() => stateConfere("abc123", valor));
	}
});
