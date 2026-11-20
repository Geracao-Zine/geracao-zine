export type CoverPage = {
	id: string;
	kind: "cover";
};

export type PoemPage = {
	id: string;
	kind: "poem";
	title: string;
	poetry: string;
};

export type ZinePage = CoverPage | PoemPage;

export type PoemField = "title" | "poetry";

export type ZineDoc = {
	pages: ZinePage[];
	sequence: number;
};

export const COVER_PAGE_ID = "cover";

export function createDoc(): ZineDoc {
	return {
		pages: [
			{ id: COVER_PAGE_ID, kind: "cover" },
			{ id: "page-1", kind: "poem", title: "", poetry: "" },
		],
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
	const page: PoemPage = {
		id: `page-${sequence}`,
		kind: "poem",
		title: "",
		poetry: "",
	};

	return {
		pages: [...doc.pages, page],
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
	field: PoemField,
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
