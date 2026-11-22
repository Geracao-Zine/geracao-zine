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

// O script e unico por pagina. Guardar a promessa evita inserir duas tags se
// dois componentes pedirem ao mesmo tempo, e permite reaproveitar o carregado.
let carregando: Promise<GoogleAccounts> | null = null;

export function gisDisponivel(janela: unknown): boolean {
	const w = janela as JanelaComGoogle;

	return typeof w?.google?.accounts?.oauth2?.initCodeClient === "function";
}

export function carregarGis(documento: Document = document): Promise<GoogleAccounts> {
	if (gisDisponivel(documento.defaultView)) {
		return Promise.resolve((documento.defaultView as JanelaComGoogle).google!.accounts!);
	}

	if (carregando) {
		return carregando;
	}

	carregando = new Promise<GoogleAccounts>((resolver, rejeitar) => {
		const existente = documento.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);

		const concluir = (): void => {
			if (gisDisponivel(documento.defaultView)) {
				resolver((documento.defaultView as JanelaComGoogle).google!.accounts!);
			} else {
				carregando = null;
				rejeitar(new Error("google identity services nao inicializou"));
			}
		};

		if (existente) {
			existente.addEventListener("load", concluir, { once: true });
			existente.addEventListener("error", () => {
				carregando = null;
				rejeitar(new Error("falha ao carregar o script do google"));
			}, { once: true });
			return;
		}

		const script = documento.createElement("script");

		script.src = GIS_SRC;
		script.async = true;
		script.defer = true;
		script.addEventListener("load", concluir, { once: true });
		script.addEventListener("error", () => {
			carregando = null;
			rejeitar(new Error("falha ao carregar o script do google"));
		}, { once: true });
		documento.head.appendChild(script);
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
