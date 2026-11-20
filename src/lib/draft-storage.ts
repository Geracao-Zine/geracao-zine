import type { ZineDraft } from "../domain/index.ts";
import { parseDraft, serializeDraft } from "../domain/index.ts";

export const DRAFT_STORAGE_KEY = "geracao-zine:draft";

export type DraftStorage = {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
	removeItem: (key: string) => void;
};

/**
 * `localStorage` nao existe no servidor nem quando o navegador bloqueia
 * armazenamento (modo privado, politica de cookies). Nesses casos a aplicacao
 * segue funcionando, so sem rascunho entre recarregamentos.
 */
export function browserStorage(): DraftStorage | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export function loadDraft(storage: DraftStorage | null): ZineDraft | null {
	if (!storage) {
		return null;
	}

	try {
		return parseDraft(storage.getItem(DRAFT_STORAGE_KEY));
	} catch {
		return null;
	}
}

export function saveDraft(storage: DraftStorage | null, draft: ZineDraft): void {
	if (!storage) {
		return;
	}

	try {
		storage.setItem(DRAFT_STORAGE_KEY, serializeDraft(draft));
	} catch {
		// cota cheia ou armazenamento bloqueado: perder o rascunho e aceitavel,
		// quebrar a edicao nao e
	}
}

export function clearDraft(storage: DraftStorage | null): void {
	if (!storage) {
		return;
	}

	try {
		storage.removeItem(DRAFT_STORAGE_KEY);
	} catch {
		// idem acima
	}
}
