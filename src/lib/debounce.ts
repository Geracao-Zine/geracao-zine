/** Espera padrao entre a ultima tecla e a gravacao, em milissegundos. */
export const DEBOUNCE_MS = 800;

/**
 * Gravacao local e mais barata que uma requisicao, entao pode ser mais frequente.
 * Curto o bastante para o rascunho sobreviver a um fechamento abrupto.
 */
export const LOCAL_SAVE_MS = 250;

export type Debounced<A extends unknown[]> = {
	/** Agenda a chamada; cada chamada reinicia a contagem. */
	agendar: (...args: A) => void;
	/** Executa agora o que estiver pendente. Sem pendencia, nao faz nada. */
	liberar: () => void;
	/** Descarta o que estiver pendente. */
	cancelar: () => void;
	/** Verdadeiro quando ha uma chamada agendada. */
	pendente: () => boolean;
};

type Timer = ReturnType<typeof setTimeout>;

type Relogio = {
	setTimeout: (handler: () => void, ms: number) => Timer;
	clearTimeout: (id: Timer) => void;
};

/**
 * Agrupa chamadas seguidas numa so.
 *
 * Existe porque salvar na conta a cada tecla geraria uma requisicao por
 * caractere. `liberar` e o que permite nao perder a ultima edicao quando a
 * pessoa sai da pagina antes do prazo terminar.
 *
 * O relogio e injetavel para o teste nao depender de tempo real.
 */
export function debounce<A extends unknown[]>(
	acao: (...args: A) => void,
	ms: number = DEBOUNCE_MS,
	// Envelopes evitam `Illegal invocation`: o navegador exige que
	// `setTimeout`/`clearTimeout` sejam chamados com `this` global.
	relogio: Relogio = {
		setTimeout: (handler, ms) => setTimeout(handler, ms),
		clearTimeout: (id) => clearTimeout(id),
	}
): Debounced<A> {
	let timer: Timer | null = null;
	let ultimos: A | null = null;

	const cancelar = (): void => {
		if (timer !== null) {
			relogio.clearTimeout(timer);
			timer = null;
		}

		ultimos = null;
	};

	const agendar = (...args: A): void => {
		ultimos = args;

		if (timer !== null) {
			relogio.clearTimeout(timer);
		}

		timer = relogio.setTimeout(() => {
			timer = null;

			const pendentes = ultimos;
			ultimos = null;

			if (pendentes) {
				acao(...pendentes);
			}
		}, ms);
	};

	const liberar = (): void => {
		if (timer === null) {
			return;
		}

		relogio.clearTimeout(timer);
		timer = null;

		const pendentes = ultimos;
		ultimos = null;

		if (pendentes) {
			acao(...pendentes);
		}
	};

	return { agendar, liberar, cancelar, pendente: () => timer !== null };
}
