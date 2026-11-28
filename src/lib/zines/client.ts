import type { ZineDraft } from "../../domain/index.ts";
import { DRAFT_VERSION, parseDraft } from "../../domain/index.ts";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export type ZineAuthor = {
	name: string | null;
	avatarUrl: string | null;
};

/** Zine como a API devolve: o que a biblioteca e o editor usam. */
export type ZineDaConta = {
	id: string;
	title: string;
	visibility: "private" | "public";
	content: unknown;
	contentVersion: number;
	slug: string | null;
	updatedAt: string;
	author: ZineAuthor;
	/** Verdadeiro quando o zine e de quem esta vendo. */
	mine: boolean;
	favorited: boolean;
};

export type ResultadoSalvar =
	| { ok: true; zine: ZineDaConta }
	| { ok: false; motivo: string };

// Codigos da API de zines que tem traducao util na tela. O resto cai numa
// mensagem generica: melhor "nao foi possivel salvar" do que um codigo cru.
const MENSAGENS: Record<string, string> = {
	nao_autenticado: "Sua sessao expirou. Entre de novo para salvar na conta.",
	sessao_invalida: "Sua sessao expirou. Entre de novo para salvar na conta.",
	titulo_ausente: "Dê um título ao zine antes de salvar na conta.",
	titulo_longo: "O título é longo demais para salvar.",
	conteudo_invalido: "O conteúdo do zine nao pode ser salvo.",
	versao_invalida: "O rascunho esta numa versao que o servidor nao aceita.",
	zine_nao_encontrado: "Este zine nao esta mais na sua conta.",
	origem_invalida: "A requisicao veio de uma origem inesperada.",
};

export const MENSAGEM_FALHA_GENERICA = "Nao foi possivel salvar agora. Tente de novo.";

export function mensagemDeErro(codigo: string): string {
	return MENSAGENS[codigo] ?? MENSAGEM_FALHA_GENERICA;
}

function zineDe(corpo: unknown): ZineDaConta | null {
	if (typeof corpo !== "object" || corpo === null) {
		return null;
	}

	const zine = (corpo as { zine?: unknown }).zine;

	if (typeof zine !== "object" || zine === null) {
		return null;
	}

	const candidato = zine as Partial<ZineDaConta>;

	if (typeof candidato.id !== "string" || typeof candidato.title !== "string") {
		return null;
	}

	const autor = (candidato.author ?? {}) as Partial<ZineAuthor>;

	return {
		id: candidato.id,
		title: candidato.title,
		visibility: candidato.visibility === "public" ? "public" : "private",
		content: candidato.content,
		contentVersion:
			typeof candidato.contentVersion === "number" ? candidato.contentVersion : DRAFT_VERSION,
		slug: typeof candidato.slug === "string" ? candidato.slug : null,
		updatedAt: typeof candidato.updatedAt === "string" ? candidato.updatedAt : "",
		author: {
			name: typeof autor.name === "string" ? autor.name : null,
			avatarUrl: typeof autor.avatarUrl === "string" ? autor.avatarUrl : null,
		},
		mine: candidato.mine === true,
		favorited: candidato.favorited === true,
	};
}

async function codigoDeErro(resposta: Response): Promise<string> {
	try {
		const corpo: unknown = await resposta.json();

		if (typeof corpo === "object" && corpo !== null) {
			const codigo = (corpo as { error?: unknown }).error;

			if (typeof codigo === "string") {
				return codigo;
			}
		}
	} catch {
		// corpo vazio ou nao-JSON: cai no generico
	}

	return "falha_interna";
}

/**
 * Tira do rascunho o que a API guarda.
 *
 * `step` fica de fora de proposito: em que etapa a pessoa parou e assunto do
 * navegador, nao do zine salvo. Mandar isso faria o zine abrir na etapa de
 * impressao em outro dispositivo, o que nao e o que o autor espera.
 */
function conteudoDe(draft: ZineDraft): unknown {
	return { ...draft, step: "cover" };
}

function tituloDe(draft: ZineDraft): string {
	const titulo = draft.cover.title.trim();

	// A API exige titulo. Um zine sem titulo ainda nao esta pronto para a
	// conta: quem chama usa `tituloDe` para decidir se ja pode salvar.
	return titulo.length > 0 ? titulo : "Zine sem titulo";
}

export function podeSalvar(draft: ZineDraft): boolean {
	return draft.cover.title.trim().length > 0;
}

async function corpoDe(resposta: Response): Promise<ResultadoSalvar> {
	if (!resposta.ok) {
		return { ok: false, motivo: mensagemDeErro(await codigoDeErro(resposta)) };
	}

	const zine = zineDe(await resposta.json());

	return zine ? { ok: true, zine } : { ok: false, motivo: MENSAGEM_FALHA_GENERICA };
}

/** Cria um zine novo na conta do usuario da sessao. */
export async function criarZineNaConta(
	draft: ZineDraft,
	fetcher: Fetcher = fetch
): Promise<ResultadoSalvar> {
	try {
		const resposta = await fetcher("/api/zines", {
			method: "POST",
			credentials: "same-origin",
			headers: { "content-type": "application/json", accept: "application/json" },
			body: JSON.stringify({
				title: tituloDe(draft),
				content: conteudoDe(draft),
				contentVersion: DRAFT_VERSION,
			}),
		});

		return corpoDe(resposta);
	} catch {
		// Falha de rede: quem chama mantem o rascunho local intacto.
		return { ok: false, motivo: MENSAGEM_FALHA_GENERICA };
	}
}

/** Grava o rascunho por cima de um zine que ja esta na conta. */
export async function atualizarZineNaConta(
	id: string,
	draft: ZineDraft,
	fetcher: Fetcher = fetch
): Promise<ResultadoSalvar> {
	try {
		const resposta = await fetcher(`/api/zines/${id}`, {
			method: "PATCH",
			credentials: "same-origin",
			headers: { "content-type": "application/json", accept: "application/json" },
			body: JSON.stringify({
				title: tituloDe(draft),
				content: conteudoDe(draft),
				contentVersion: DRAFT_VERSION,
			}),
		});

		return corpoDe(resposta);
	} catch {
		return { ok: false, motivo: MENSAGEM_FALHA_GENERICA };
	}
}

/**
 * Zines da conta, do mais recente para o mais antigo.
 *
 * Qualquer falha vira lista vazia: nao achar o zine da conta e um caso normal
 * (conta nova), e um erro aqui nao pode impedir a pessoa de editar.
 */
export async function listarZinesDaConta(fetcher: Fetcher = fetch): Promise<ZineDaConta[]> {
	try {
		const resposta = await fetcher("/api/zines", {
			method: "GET",
			credentials: "same-origin",
			headers: { accept: "application/json" },
		});

		if (!resposta.ok) {
			return [];
		}

		const corpo: unknown = await resposta.json();
		const lista = typeof corpo === "object" && corpo !== null ? (corpo as { zines?: unknown }).zines : null;

		if (!Array.isArray(lista)) {
			return [];
		}

		return lista.map((item) => zineDe({ zine: item })).filter((zine): zine is ZineDaConta => zine !== null);
	} catch {
		return [];
	}
}

async function listaDe(fetcher: Fetcher, url: string): Promise<ZineDaConta[]> {
	try {
		const resposta = await fetcher(url, {
			method: "GET",
			credentials: "same-origin",
			headers: { accept: "application/json" },
		});

		if (!resposta.ok) {
			return [];
		}

		const corpo: unknown = await resposta.json();
		const lista = typeof corpo === "object" && corpo !== null ? (corpo as { zines?: unknown }).zines : null;

		if (!Array.isArray(lista)) {
			return [];
		}

		return lista.map((item) => zineDe({ zine: item })).filter((zine): zine is ZineDaConta => zine !== null);
	} catch {
		return [];
	}
}

/** Biblioteca: todos os zines publicos, de qualquer autor. */
export function listarBiblioteca(fetcher: Fetcher = fetch): Promise<ZineDaConta[]> {
	return listaDe(fetcher, "/api/zines?scope=public");
}

/** Zines que quem esta logado favoritou. */
export function listarFavoritos(fetcher: Fetcher = fetch): Promise<ZineDaConta[]> {
	return listaDe(fetcher, "/api/zines?scope=favorites");
}

export type ResultadoZine =
	| { ok: true; zine: ZineDaConta }
	| { ok: false; motivo: string };

/** Busca um zine por id. Privado alheio responde igual a inexistente. */
export async function obterZine(id: string, fetcher: Fetcher = fetch): Promise<ResultadoZine> {
	try {
		const resposta = await fetcher(`/api/zines/${id}`, {
			method: "GET",
			credentials: "same-origin",
			headers: { accept: "application/json" },
		});

		if (!resposta.ok) {
			return { ok: false, motivo: mensagemDeErro(await codigoDeErro(resposta)) };
		}

		const zine = zineDe(await resposta.json());

		return zine ? { ok: true, zine } : { ok: false, motivo: MENSAGEM_FALHA_GENERICA };
	} catch {
		return { ok: false, motivo: MENSAGEM_FALHA_GENERICA };
	}
}

export type ResultadoFavorito = { ok: true; favorited: boolean } | { ok: false; motivo: string };

/**
 * Liga ou desliga o favorito.
 *
 * Devolve o estado final em vez do zine inteiro: e o unico campo que o clique
 * muda, e assim o DELETE nao precisa de um GET so para preencher o resto.
 */
export async function alternarFavorito(
	id: string,
	favoritar: boolean,
	fetcher: Fetcher = fetch
): Promise<ResultadoFavorito> {
	try {
		const resposta = await fetcher(`/api/zines/${id}/favorite`, {
			method: favoritar ? "POST" : "DELETE",
			credentials: "same-origin",
			headers: { accept: "application/json" },
		});

		if (!resposta.ok) {
			return { ok: false, motivo: mensagemDeErro(await codigoDeErro(resposta)) };
		}

		return { ok: true, favorited: favoritar };
	} catch {
		return { ok: false, motivo: MENSAGEM_FALHA_GENERICA };
	}
}

/** Troca publico/privado. So o dono consegue: a API responde 404 para os outros. */
export async function definirVisibilidade(
	id: string,
	visibility: "private" | "public",
	fetcher: Fetcher = fetch
): Promise<ResultadoZine> {
	try {
		const resposta = await fetcher(`/api/zines/${id}`, {
			method: "PATCH",
			credentials: "same-origin",
			headers: { "content-type": "application/json", accept: "application/json" },
			body: JSON.stringify({ visibility }),
		});

		if (!resposta.ok) {
			return { ok: false, motivo: mensagemDeErro(await codigoDeErro(resposta)) };
		}

		const zine = zineDe(await resposta.json());

		return zine ? { ok: true, zine } : { ok: false, motivo: MENSAGEM_FALHA_GENERICA };
	} catch {
		return { ok: false, motivo: MENSAGEM_FALHA_GENERICA };
	}
}

/**
 * Converte o `content` guardado de volta em rascunho.
 *
 * Passa pelo `parseDraft` do dominio, o mesmo caminho do `localStorage`: um
 * JSON de uma versao anterior cai nos padroes campo a campo em vez de quebrar
 * o editor.
 */
export function draftDoZine(zine: ZineDaConta): ZineDraft | null {
	try {
		return parseDraft(JSON.stringify(zine.content));
	} catch {
		return null;
	}
}
