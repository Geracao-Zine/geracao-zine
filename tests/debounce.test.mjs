import assert from "node:assert/strict";
import { test } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";

const { debounce, DEBOUNCE_MS, LOCAL_SAVE_MS } = await import("../src/lib/debounce.ts");

/** Relogio de mentira: o teste decide quando o tempo passa. */
function relogioFalso() {
	let agora = 0;
	let proximoId = 1;
	const timers = new Map();

	return {
		agora: () => agora,
		setTimeout: (handler, ms) => {
			const id = proximoId++;
			timers.set(id, { handler, quando: agora + ms });
			return id;
		},
		clearTimeout: (id) => {
			timers.delete(id);
		},
		avancar: (ms) => {
			agora += ms;

			for (const [id, timer] of [...timers]) {
				if (timer.quando <= agora) {
					timers.delete(id);
					timer.handler();
				}
			}
		},
		pendentes: () => timers.size,
	};
}

test("chamadas seguidas viram uma so", () => {
	const relogio = relogioFalso();
	const chamadas = [];
	const d = debounce((valor) => chamadas.push(valor), 100, relogio);

	d.agendar("a");
	relogio.avancar(50);
	d.agendar("b");
	relogio.avancar(50);

	assert.deepEqual(chamadas, [], "50ms depois da segunda chamada ainda nao pode disparar");

	relogio.avancar(50);

	assert.deepEqual(chamadas, ["b"], "so a ultima chamada vale");
});

test("uma pausa maior que o prazo dispara a acao", () => {
	const relogio = relogioFalso();
	const chamadas = [];
	const d = debounce((valor) => chamadas.push(valor), 100, relogio);

	d.agendar("a");
	relogio.avancar(100);

	assert.deepEqual(chamadas, ["a"]);
	assert.equal(d.pendente(), false);
});

test("liberar executa o pendente na hora", () => {
	const relogio = relogioFalso();
	const chamadas = [];
	const d = debounce((valor) => chamadas.push(valor), 100, relogio);

	d.agendar("a");
	d.liberar();

	assert.deepEqual(chamadas, ["a"], "sair da pagina nao pode perder a ultima edicao");
	assert.equal(relogio.pendentes(), 0, "o timer nao pode ficar para tras");
});

test("liberar sem pendencia nao chama nada", () => {
	const relogio = relogioFalso();
	const chamadas = [];
	const d = debounce((valor) => chamadas.push(valor), 100, relogio);

	d.liberar();

	assert.deepEqual(chamadas, []);
});

test("liberar duas vezes nao duplica a chamada", () => {
	const relogio = relogioFalso();
	const chamadas = [];
	const d = debounce((valor) => chamadas.push(valor), 100, relogio);

	d.agendar("a");
	d.liberar();
	d.liberar();

	assert.deepEqual(chamadas, ["a"]);
});

test("cancelar descarta o pendente", () => {
	const relogio = relogioFalso();
	const chamadas = [];
	const d = debounce((valor) => chamadas.push(valor), 100, relogio);

	d.agendar("a");
	d.cancelar();
	relogio.avancar(500);

	assert.deepEqual(chamadas, []);
	assert.equal(d.pendente(), false);
});

test("depois de liberar, agendar de novo volta a funcionar", () => {
	const relogio = relogioFalso();
	const chamadas = [];
	const d = debounce((valor) => chamadas.push(valor), 100, relogio);

	d.agendar("a");
	d.liberar();
	d.agendar("b");
	relogio.avancar(100);

	assert.deepEqual(chamadas, ["a", "b"]);
});

test("a espera da conta e maior que a local", () => {
	// A conta custa uma requisicao; o disco local nao. Se o local fosse mais
	// lento, nao faria sentido existir.
	assert.ok(LOCAL_SAVE_MS < DEBOUNCE_MS);
});
