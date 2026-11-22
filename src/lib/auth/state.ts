// Valor de `state` do fluxo OAuth. O GIS devolve o mesmo valor no CodeResponse,
// o que permite detectar uma resposta que nao nasceu do pedido desta aba.
//
// Isto e defesa em profundidade, nao a unica barreira: o route handler ja recusa
// Origin estranho, o proprio GIS casa a mensagem do popup com o id do pedido, e
// o id_token tem a audience conferida no servidor.
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const TAMANHO_STATE = 32;

export function criarState(aleatorio: (bytes: number) => Uint8Array): string {
	const bytes = aleatorio(TAMANHO_STATE);

	if (bytes.length < TAMANHO_STATE) {
		throw new Error("fonte aleatoria devolveu menos bytes que o pedido");
	}

	let saida = "";

	// 62 simbolos nao dividem 256, entao descartar o excedente evita o vies de
	// modulo que deixaria os primeiros caracteres do alfabeto mais provaveis.
	const limite = 256 - (256 % ALFABETO.length);

	for (let i = 0; i < bytes.length && saida.length < TAMANHO_STATE; i += 1) {
		const valor = bytes[i];

		if (valor < limite) {
			saida += ALFABETO[valor % ALFABETO.length];
		}
	}

	if (saida.length < TAMANHO_STATE) {
		throw new Error("fonte aleatoria insuficiente para gerar o state");
	}

	return saida;
}

// `recebido` vazio significa que o provedor nao ecoou o state. O fluxo de popup
// do GIS nao garante o eco, entao recusar a ausencia quebraria o login legitimo;
// recusamos apenas o state presente e diferente.
export function stateConfere(esperado: string, recebido: string | undefined | null): boolean {
	if (typeof recebido !== "string" || recebido.length === 0) {
		return true;
	}

	if (esperado.length !== recebido.length) {
		return false;
	}

	// Comparacao de tempo constante: o custo nao depende de onde os valores
	// diferem, o que evita entregar o prefixo correto por medicao de tempo.
	let diferenca = 0;

	for (let i = 0; i < esperado.length; i += 1) {
		diferenca |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
	}

	return diferenca === 0;
}
