import { isIsoDate } from "./date.ts";

/**
 * Composicao de uma pagina do zine (o painel diagramado, nao a folha A4).
 *
 * Titulo, subtitulo e data sao opcionais: quando vazios nao reservam espaco e
 * a caixa do texto principal se expande. O texto principal e obrigatorio e
 * ocupa uma caixa de area fixa definida pelo template.
 */
export type PageFields = {
	title: string;
	subtitle: string;
	/** Data ISO (yyyy-mm-dd). Vazia significa painel sem data. */
	date: string;
	body: string;
};

export type PageField = keyof PageFields;

export const EMPTY_PAGE_FIELDS: PageFields = {
	title: "",
	subtitle: "",
	date: "",
	body: "",
};

function text(value: unknown): string {
	return typeof value === "string" ? value : "";
}

/**
 * Normaliza os campos de uma pagina vinda de fora (JSON salvo, formulario).
 *
 * `poetry` e o nome antigo do texto principal: rascunhos salvos antes do
 * modelo de quatro campos continuam legiveis.
 */
export function pageFieldsFrom(source: Record<string, unknown>): PageFields {
	const date = text(source.date);

	return {
		title: text(source.title),
		subtitle: text(source.subtitle),
		date: isIsoDate(date) ? date : "",
		body: text(source.body) || text(source.poetry),
	};
}
