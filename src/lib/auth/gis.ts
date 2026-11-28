// Ponte com o Google Identity Services. Fica fora do componente para o
// carregamento do script e a leitura da resposta serem testaveis sem navegador.
import { criarState, stateConfere } from "./state.ts";

export const GIS_SRC = "https://accounts.google.com/gsi/client";

export type CodeResponse = {
	code?: string;
	state?: string;
	error?: string;
	error_description?: string;
};

type CodeClient = {
	requestCode: () => void;
};

type CodeClientConfig = {
	client_id: string;
	scope: string;
	ux_mode: "popup";
	state?: string;
	callback: (response: CodeResponse) => void;
	error_callback?: (error: { type?: string }) => void;
};

type GoogleAccounts = {
	oauth2: {
		initCodeClient: (config: CodeClientConfig) => CodeClient;
	};
};

type JanelaComGoogle = Window & { google?: { accounts?: GoogleAccounts } };

/**
 * Quanto esperar o script do Google antes de desistir. Sem prazo, um script
 * bloqueado (extensao, proxy, rede) deixaria a promessa pendente para sempre e
 * o botao de entrar nunca ficaria utilizavel.
 */
export const GIS_TIMEOUT_MS = 10000;

export type MotivoFalhaGis = "timeout" | "script";

export class FalhaGis extends Error {
	readonly motivo: MotivoFalhaGis;

	constructor(motivo: MotivoFalhaGis, mensagem: string) {
		super(mensagem);
		this.name = "FalhaGis";
		this.motivo = motivo;
	}
}

/** Texto para a tela. O motivo tecnico nao interessa a quem esta tentando entrar. */
export function mensagemDeFalhaGis(erro: unknown): string {
	if (erro instanceof FalhaGis && erro.motivo === "timeout") {
		return "O login do Google demorou demais para responder. Verifique sua conexao e tente de novo.";
	}

	return "Nao foi possivel carregar o login do Google.";
}

type Timer = ReturnType<typeof setTimeout>;

type Relogio = {
	setTimeout: (handler: () => void, ms: number) => Timer;
	clearTimeout: (id: Timer) => void;
};

const relogioPadrao: Relogio = {
	setTimeout: (handler, ms) => setTimeout(handler, ms),
	clearTimeout: (id) => clearTimeout(id),
};

export type OpcoesCarga = {
	timeoutMs?: number;
	relogio?: Relogio;
};

// O script e unico por pagina. Guardar a promessa evita inserir duas tags se
// dois componentes pedirem ao mesmo tempo, e permite reaproveitar o carregado.
let carregando: Promise<GoogleAccounts> | null = null;

export function gisDisponivel(janela: unknown): boolean {
	const w = janela as JanelaComGoogle;

	return typeof w?.google?.accounts?.oauth2?.initCodeClient === "function";
}

export function carregarGis(
	documento: Document = document,
	opcoes: OpcoesCarga = {},
): Promise<GoogleAccounts> {
	if (gisDisponivel(documento.defaultView)) {
		return Promise.resolve((documento.defaultView as JanelaComGoogle).google!.accounts!);
	}

	if (carregando) {
		return carregando;
	}

	const timeoutMs = opcoes.timeoutMs ?? GIS_TIMEOUT_MS;
	const relogio = opcoes.relogio ?? relogioPadrao;

	carregando = new Promise<GoogleAccounts>((resolver, rejeitar) => {
		const existente = documento.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
		const script = existente ?? documento.createElement("script");
		let encerrado = false;
		let timer: Timer | null = null;

		// Encerra uma unica vez: limpa o prazo e os ouvintes para que um "load"
		// tardio, depois do timeout, nao resolva a promessa.
		function finalizar(): boolean {
			if (encerrado) {
				return false;
			}

			encerrado = true;

			if (timer !== null) {
				relogio.clearTimeout(timer);
				timer = null;
			}

			script.removeEventListener("load", aoCarregar);
			script.removeEventListener("error", aoFalhar);

			return true;
		}

		function desistir(erro: Error): void {
			if (!finalizar()) {
				return;
			}

			// Liberar a promessa memorizada e o que permite uma nova tentativa; sem
			// isso o botao ficaria inerte ate recarregar a pagina.
			carregando = null;

			// Um script que nao respondeu nao vai responder depois: remover deixa a
			// proxima tentativa pedir o arquivo de novo. So vale para a tag que este
			// carregador inseriu; uma tag pre-existente e de outra parte da pagina.
			if (!existente) {
				script.remove();
			}

			rejeitar(erro);
		}

		function aoCarregar(): void {
			if (!finalizar()) {
				return;
			}

			if (gisDisponivel(documento.defaultView)) {
				resolver((documento.defaultView as JanelaComGoogle).google!.accounts!);
				return;
			}

			carregando = null;
			rejeitar(new FalhaGis("script", "google identity services nao inicializou"));
		}

		function aoFalhar(): void {
			desistir(new FalhaGis("script", "falha ao carregar o script do google"));
		}

		script.addEventListener("load", aoCarregar, { once: true });
		script.addEventListener("error", aoFalhar, { once: true });

		timer = relogio.setTimeout(() => {
			timer = null;
			desistir(new FalhaGis("timeout", "o script do google nao respondeu a tempo"));
		}, timeoutMs);

		if (!existente) {
			script.src = GIS_SRC;
			script.async = true;
			script.defer = true;
			documento.head.appendChild(script);
		}
	});

	return carregando;
}

// Só para teste: solta a promessa memorizada entre casos.
export function reiniciarGis(): void {
	carregando = null;
}

export type ResultadoCode =
	| { ok: true; code: string }
	| { ok: false; motivo: string };

export function interpretarResposta(
	resposta: CodeResponse,
	esperado: string,
): ResultadoCode {
	if (resposta.error) {
		if (resposta.error === "popup_closed") {
			return { ok: false, motivo: "Janela do Google fechada antes de concluir." };
		}

		if (resposta.error === "access_denied") {
			return { ok: false, motivo: "Acesso negado na tela do Google." };
		}

		return { ok: false, motivo: "O Google recusou o pedido de login." };
	}

	if (!stateConfere(esperado, resposta.state)) {
		return { ok: false, motivo: "Resposta de login inesperada. Tente de novo." };
	}

	if (typeof resposta.code !== "string" || resposta.code.length === 0) {
		return { ok: false, motivo: "O Google nao devolveu o codigo de autorizacao." };
	}

	return { ok: true, code: resposta.code };
}

export type PedidoDeLogin = {
	state: string;
	pedirCode: () => void;
};

export async function prepararLogin(options: {
	clientId: string;
	aleatorio: (bytes: number) => Uint8Array;
	aoResponder: (resultado: ResultadoCode) => void;
	documento?: Document;
}): Promise<PedidoDeLogin> {
	const accounts = await carregarGis(options.documento);
	const state = criarState(options.aleatorio);

	const client = accounts.oauth2.initCodeClient({
		client_id: options.clientId,
		scope: "openid email profile",
		ux_mode: "popup",
		state,
		// A validacao do state e do code fica aqui, para o componente receber
		// apenas um resultado ja interpretado.
		callback: (resposta) => options.aoResponder(interpretarResposta(resposta, state)),
		error_callback: (erro) => {
			options.aoResponder({
				ok: false,
				motivo:
					erro?.type === "popup_closed"
						? "Janela do Google fechada antes de concluir."
						: "Nao foi possivel abrir a janela do Google.",
			});
		},
	});

	return { state, pedirCode: () => client.requestCode() };
}
