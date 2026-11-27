import type { PublicUser } from "./users.ts";

export type SessionState =
	| { status: "carregando" }
	| { status: "anonimo" }
	| { status: "autenticado"; user: PublicUser };

export const SESSION_INICIAL: SessionState = { status: "carregando" };

export type LoginOutcome =
	| { ok: true; user: PublicUser }
	| { ok: false; motivo: string };

// Codigos que o servidor devolve e o que cada um significa para quem esta na
// tela. Sem este mapa a interface mostraria "falha_no_login" para o visitante.
const MENSAGENS: Record<string, string> = {
	code_ausente: "O Google nao devolveu o codigo de autorizacao.",
	origem_invalida: "A requisicao veio de uma origem inesperada.",
	json_invalido: "Nao foi possivel ler a resposta do login.",
	sessao_invalida: "Sua sessao expirou. Entre de novo.",
	nao_autenticado: "Voce nao esta conectado.",
	falha_no_login: "Nao foi possivel entrar agora. Tente de novo.",
	conta_em_conflito: "Este email ja esta ligado a outra conta Google.",
	email_nao_verificado: "Confirme seu email no Google antes de entrar.",
};

export function mensagemDeErro(codigo: string): string {
	return MENSAGENS[codigo] ?? MENSAGENS.falha_no_login;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Prazo das chamadas de login. Sem ele, um servidor que aceita a conexao e nao
 * responde deixaria o botao em "Entrando..." para sempre, sem erro na tela.
 */
export const LOGIN_TIMEOUT_MS = 15000;

function comPrazo(ms: number = LOGIN_TIMEOUT_MS): AbortSignal | undefined {
	// Navegador sem `AbortSignal.timeout` (Safari antigo) perderia o login inteiro
	// se isto lancasse; sem prazo a requisicao volta ao comportamento anterior.
	if (typeof AbortSignal.timeout !== "function") {
		return undefined;
	}

	return AbortSignal.timeout(ms);
}

function ehTimeout(erro: unknown): boolean {
	return erro instanceof Error && (erro.name === "TimeoutError" || erro.name === "AbortError");
}

type RespostaSessao = { user?: unknown };

function usuarioDe(corpo: unknown): PublicUser | null {
	if (typeof corpo !== "object" || corpo === null) {
		return null;
	}

	const user = (corpo as RespostaSessao).user;

	if (typeof user !== "object" || user === null) {
		return null;
	}

	const candidato = user as Partial<PublicUser>;

	if (typeof candidato.id !== "string" || typeof candidato.email !== "string") {
		return null;
	}

	return {
		id: candidato.id,
		email: candidato.email,
		name: typeof candidato.name === "string" ? candidato.name : null,
		avatarUrl: typeof candidato.avatarUrl === "string" ? candidato.avatarUrl : null,
		emailVerified: candidato.emailVerified === true,
	};
}

// Le a sessao atual. Qualquer falha (rede, 500, corpo estranho) vira anonimo:
// um erro aqui nao pode travar a pagina, e o pior caso e pedir login de novo.
export async function buscarSessao(
	fetcher: Fetcher = fetch,
): Promise<SessionState> {
	try {
		const resposta = await fetcher("/api/auth/me", {
			method: "GET",
			credentials: "same-origin",
			headers: { accept: "application/json" },
			signal: comPrazo(),
		});

		if (!resposta.ok) {
			return { status: "anonimo" };
		}

		const user = usuarioDe(await resposta.json());

		return user ? { status: "autenticado", user } : { status: "anonimo" };
	} catch {
		return { status: "anonimo" };
	}
}

export type ConfigPublica = { googleClientId: string | null };

// Lido em tempo de execucao. Se viesse do build (`NEXT_PUBLIC_*`), um build
// feito sem a variavel geraria um site sem botao de login, sem erro aparente.
export async function buscarConfig(fetcher: Fetcher = fetch): Promise<ConfigPublica> {
	try {
		const resposta = await fetcher("/api/auth/config", {
			method: "GET",
			credentials: "same-origin",
			headers: { accept: "application/json" },
			signal: comPrazo(),
		});

		if (!resposta.ok) {
			return { googleClientId: null };
		}

		const corpo: unknown = await resposta.json();

		if (typeof corpo === "object" && corpo !== null) {
			const id = (corpo as { googleClientId?: unknown }).googleClientId;
			return { googleClientId: typeof id === "string" && id.length > 0 ? id : null };
		}

		return { googleClientId: null };
	} catch {
		return { googleClientId: null };
	}
}

export async function entrarComCode(
	code: string,
	fetcher: Fetcher = fetch,
): Promise<LoginOutcome> {
	try {
		const resposta = await fetcher("/api/auth/google", {
			method: "POST",
			credentials: "same-origin",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ code }),
			signal: comPrazo(),
		});

		const corpo: unknown = await resposta.json().catch(() => null);

		if (!resposta.ok) {
			const codigo =
				typeof corpo === "object" && corpo !== null && typeof (corpo as { error?: unknown }).error === "string"
					? (corpo as { error: string }).error
					: "falha_no_login";

			return { ok: false, motivo: mensagemDeErro(codigo) };
		}

		const user = usuarioDe(corpo);

		return user ? { ok: true, user } : { ok: false, motivo: mensagemDeErro("falha_no_login") };
	} catch (erro) {
		if (ehTimeout(erro)) {
			return { ok: false, motivo: "O servidor demorou demais para responder. Tente de novo." };
		}

		return { ok: false, motivo: "Sem conexao com o servidor. Verifique sua rede." };
	}
}

// O logout limpa o cookie no servidor. Se a chamada falhar, a interface ainda
// esquece o usuario local: manter a tela logada depois do clique seria pior.
export async function sair(fetcher: Fetcher = fetch): Promise<void> {
	try {
		await fetcher("/api/auth/logout", {
			method: "POST",
			credentials: "same-origin",
			signal: comPrazo(),
		});
	} catch {
		return;
	}
}
