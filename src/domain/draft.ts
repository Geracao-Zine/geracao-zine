import type { Cover } from "./cover.ts";
import { isCoverComplete } from "./cover.ts";
import type { ZineFormat } from "./format.ts";
import { DEFAULT_FORMAT, FORMAT_OPTIONS } from "./format.ts";
import type { PageFields } from "./page.ts";
import { pageFieldsFrom } from "./page.ts";
import type { PoemPage, ZineDoc } from "./zine.ts";
import { COVER_PAGE_ID, createDoc, poemPages } from "./zine.ts";
import { resolveFontId } from "../lib/fonts.ts";

export type ZineStep = "cover" | "poems" | "review" | "print";

export type StepOption = {
	id: ZineStep;
	label: string;
	description: string;
};

export const STEPS: StepOption[] = [
	{
		id: "cover",
		label: "Capa e autoria",
		description: "Título, nome do autor e fontes.",
	},
	{
		id: "poems",
		label: "Poesias",
		description: "Adicione, edite e ordene os textos.",
	},
	{
		id: "review",
		label: "Revisão",
		description: "Confira o conteúdo e as pendências.",
	},
	{
		id: "print",
		label: "Dobra e impressão",
		description: "Escolha a dobra e baixe o PDF.",
	},
];

export const DEFAULT_STEP: ZineStep = "cover";

export const DRAFT_VERSION = 1;

export type ZineDraft = {
	version: number;
	step: ZineStep;
	cover: Cover;
	doc: ZineDoc;
	format: ZineFormat;
};

export type DraftIssue = {
	id: string;
	message: string;
	severity: "warning" | "error";
	step: ZineStep;
};

export type StepStatus = "done" | "pending" | "blocked";

export function createDraft(): ZineDraft {
	return {
		version: DRAFT_VERSION,
		step: DEFAULT_STEP,
		cover: {
			title: "",
			author: "",
			titleFont: "geistSans",
			authorFont: "geistMono",
			date: "",
		},
		doc: createDoc(),
		format: DEFAULT_FORMAT,
	};
}

export function stepIndex(step: ZineStep): number {
	return STEPS.findIndex((option) => option.id === step);
}

export function isZineStep(value: unknown): value is ZineStep {
	return STEPS.some((option) => option.id === value);
}

export function isZineFormat(value: unknown): value is ZineFormat {
	return FORMAT_OPTIONS.some((option) => option.id === value);
}

function text(value: unknown): string {
	return typeof value === "string" ? value : "";
}

/**
 * Reconstroi um rascunho a partir do JSON salvo.
 *
 * O conteudo vem de `localStorage`, que pode ter sido editado ou ficado de uma
 * versao anterior. Cada campo e validado isoladamente e, quando algo nao serve,
 * cai no padrao: melhor perder um campo do que descartar o rascunho inteiro.
 */
export function parseDraft(raw: string | null): ZineDraft | null {
	if (!raw) {
		return null;
	}

	let data: unknown;

	try {
		data = JSON.parse(raw);
	} catch {
		return null;
	}

	if (!data || typeof data !== "object") {
		return null;
	}

	const source = data as Record<string, unknown>;
	const coverSource =
		source.cover && typeof source.cover === "object"
			? (source.cover as Record<string, unknown>)
			: {};
	const docSource =
		source.doc && typeof source.doc === "object"
			? (source.doc as Record<string, unknown>)
			: {};

	const fallback = createDraft();

	return {
		version: DRAFT_VERSION,
		step: isZineStep(source.step) ? source.step : DEFAULT_STEP,
		format: isZineFormat(source.format) ? source.format : DEFAULT_FORMAT,
		cover: {
			title: text(coverSource.title),
			author: text(coverSource.author),
			titleFont: resolveFontId(text(coverSource.titleFont)),
			authorFont: resolveFontId(text(coverSource.authorFont)),
			date: text(coverSource.date),
		},
		doc: parseDoc(docSource, fallback.doc),
	};
}

function parseDoc(source: Record<string, unknown>, fallback: ZineDoc): ZineDoc {
	if (!Array.isArray(source.pages)) {
		return fallback;
	}

	const poems: PoemPage[] = [];
	let highest = 0;

	for (const entry of source.pages) {
		if (!entry || typeof entry !== "object") {
			continue;
		}

		const page = entry as Record<string, unknown>;

		if (page.kind !== "poem") {
			continue;
		}

		const id = text(page.id) || `page-${poems.length + 1}`;

		if (poems.some((poem) => poem.id === id)) {
			continue;
		}

		const fields: PageFields = pageFieldsFrom(page);

		poems.push({ id, kind: "poem", ...fields });

		const numero = Number(id.replace(/^page-/, ""));
		if (Number.isFinite(numero) && numero > highest) {
			highest = numero;
		}
	}

	const pages = [{ id: COVER_PAGE_ID, kind: "cover" } as const, ...poems];

	return {
		pages,
		sequence: Math.max(highest, poems.length),
	};
}

export function serializeDraft(draft: ZineDraft): string {
	return JSON.stringify(draft);
}

export function hasPoemContent(draft: ZineDraft): boolean {
	return poemPages(draft.doc).some((poem) => poem.body.trim().length > 0);
}

export function draftIssues(draft: ZineDraft): DraftIssue[] {
	const issues: DraftIssue[] = [];
	const poems = poemPages(draft.doc);

	if (!draft.cover.title.trim()) {
		issues.push({
			id: "cover-title",
			message: "Capa sem título",
			severity: "error",
			step: "cover",
		});
	}

	if (!draft.cover.author.trim()) {
		issues.push({
			id: "cover-author",
			message: "Capa sem autoria",
			severity: "error",
			step: "cover",
		});
	}

	if (poems.length === 0) {
		issues.push({
			id: "no-poems",
			message: "Nenhuma poesia cadastrada",
			severity: "error",
			step: "poems",
		});
	}

	const untitled = poems.filter((poem) => !poem.title.trim()).length;

	if (untitled > 0) {
		issues.push({
			id: "untitled-poems",
			message:
				untitled === 1
					? "1 poesia sem título"
					: `${untitled} poesias sem título`,
			severity: "warning",
			step: "poems",
		});
	}

	const empty = poems.filter((poem) => !poem.body.trim()).length;

	if (empty > 0) {
		issues.push({
			id: "empty-pages",
			message: empty === 1 ? "1 página vazia" : `${empty} páginas vazias`,
			severity: "warning",
			step: "poems",
		});
	}

	if (poems.length > 0 && !hasPoemContent(draft)) {
		issues.push({
			id: "no-text",
			message: "Nenhum texto escrito",
			severity: "error",
			step: "poems",
		});
	}

	return issues;
}

/** Conteudo minimo: capa completa e pelo menos uma poesia com texto. */
export function isDraftDiagrammable(draft: ZineDraft): boolean {
	return isCoverComplete(draft.cover) && hasPoemContent(draft);
}

export function canEnterStep(draft: ZineDraft, step: ZineStep): boolean {
	if (step === "print") {
		return isDraftDiagrammable(draft);
	}

	return true;
}

export function stepStatus(draft: ZineDraft, step: ZineStep): StepStatus {
	const issues = draftIssues(draft);

	if (step === "print") {
		if (!isDraftDiagrammable(draft)) {
			return "blocked";
		}

		return issues.length > 0 ? "pending" : "done";
	}

	if (step === "review") {
		if (issues.some((issue) => issue.severity === "error")) {
			return "blocked";
		}

		return issues.length > 0 ? "pending" : "done";
	}

	const doPasso = issues.filter((issue) => issue.step === step);

	if (doPasso.some((issue) => issue.severity === "error")) {
		return "blocked";
	}

	return doPasso.length > 0 ? "pending" : "done";
}
