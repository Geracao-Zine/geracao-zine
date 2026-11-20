import type { PageFields } from "./page.ts";
import { EMPTY_PAGE_FIELDS } from "./page.ts";

export type CoverPage = {
	id: string;
	kind: "cover";
};

/**
 * Uma pagina do zine (o painel diagramado) com os quatro campos do modelo.
 * Titulo, subtitulo e data sao opcionais; o texto principal e obrigatorio.
 */
export type PoemPage = PageFields & {
	id: string;
	kind: "poem";
};

export type ZinePage = CoverPage | PoemPage;

export type ZineDoc = {
	pages: ZinePage[];
	sequence: number;
};

export const COVER_PAGE_ID = "cover";

function emptyPoemPage(id: string): PoemPage {
	return { id, kind: "poem", ...EMPTY_PAGE_FIELDS };
}

export function createDoc(): ZineDoc {
	return {
		pages: [{ id: COVER_PAGE_ID, kind: "cover" }, emptyPoemPage("page-1")],
		sequence: 1,
	};
}

/**
 * Move uma poesia uma posicao para cima (-1) ou para baixo (1).
 *
 * A capa nunca se move: a troca acontece entre posicoes ocupadas por poemas,
 * entao a capa continua no lugar mesmo quando ha outras paginas entre ela e a
 * poesia movida.
 */
export function movePage(
	doc: ZineDoc,
	id: string,
	direction: -1 | 1
): ZineDoc {
	const poems = poemPages(doc);
	const from = poems.findIndex((page) => page.id === id);

	if (from === -1) {
		return doc;
	}

	const to = from + direction;

	if (to < 0 || to >= poems.length) {
		return doc;
	}

	const fromIndex = doc.pages.indexOf(poems[from]);
	const toIndex = doc.pages.indexOf(poems[to]);
	const pages = [...doc.pages];

	pages[fromIndex] = poems[to];
	pages[toIndex] = poems[from];

	return { ...doc, pages };
}

export function addPage(doc: ZineDoc): ZineDoc {
	const sequence = doc.sequence + 1;

	return {
		pages: [...doc.pages, emptyPoemPage(`page-${sequence}`)],
		sequence,
	};
}

export function removePage(doc: ZineDoc, id: string): ZineDoc {
	const target = doc.pages.find((page) => page.id === id);

	if (!target || target.kind === "cover") {
		return doc;
	}

	return {
		...doc,
		pages: doc.pages.filter((page) => page.id !== id),
	};
}

export function setPoemField(
	doc: ZineDoc,
	id: string,
	field: keyof PageFields,
	value: string
): ZineDoc {
	return {
		...doc,
		pages: doc.pages.map((page) => {
			if (page.id !== id || page.kind !== "poem") {
				return page;
			}

			return { ...page, [field]: value };
		}),
	};
}

export function coverOf(doc: ZineDoc): CoverPage | undefined {
	return doc.pages.find((page): page is CoverPage => page.kind === "cover");
}

export function poemPages(doc: ZineDoc): PoemPage[] {
	return doc.pages.filter((page): page is PoemPage => page.kind === "poem");
}

export function positionOf(doc: ZineDoc, id: string): number {
	return poemPages(doc).findIndex((poem) => poem.id === id) + 1;
}
