"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	Cover,
	DraftIssue,
	PageField,
	PoemPage,
	StepStatus,
	ZineDoc,
	ZineDraft,
	PrintMode,
	ZineFormat,
	ZineStep,
} from "@/domain";
import {
	STEPS,
	addPage,
	canEnterStep,
	createDraft,
	draftIssues,
	formatIsoDate,
	isDraftDiagrammable,
	isFormatAvailable,
	isZineStep,
	movePage,
	poemPages,
	removePage,
	setPoemField,
	stepIndex,
	stepStatus,
} from "@/domain";
import {
	browserStorage,
	clearDraft,
	loadDraft,
	saveDraft,
} from "@/lib/draft-storage";
import { downloadBlob } from "@/lib/download";
import type { ZinePdfInput } from "@/lib/pdf";
import { effectivePrintMode, generateZinePdf, templateFor } from "@/lib/pdf";

export type ZineEditor = {
	/** Falso enquanto o rascunho salvo ainda nao foi lido do navegador. */
	ready: boolean;
	step: ZineStep;
	stepNumber: number;
	totalSteps: number;
	goToStep: (step: ZineStep) => void;
	nextStep: () => void;
	previousStep: () => void;
	cover: Cover;
	setCoverField: (field: keyof Cover, value: string) => void;
	doc: ZineDoc;
	poems: PoemPage[];
	/** Data ISO (yyyy-mm-dd). Vazia remove a data da capa. */
	date: string;
	setDate: (date: string) => void;
	/** Data em pt-BR, ou vazio quando a capa nao tem data. */
	formattedDate: string;
	format: ZineFormat;
	setFormat: (format: ZineFormat) => void;
	printMode: PrintMode;
	setPrintMode: (mode: PrintMode) => void;
	changeField: (id: string, field: PageField, value: string) => void;
	addPoem: () => void;
	removePoem: (id: string) => void;
	movePoem: (id: string, direction: -1 | 1) => void;
	issues: DraftIssue[];
	issuesOf: (step: ZineStep) => DraftIssue[];
	statusOf: (step: ZineStep) => StepStatus;
	diagrammable: boolean;
	canOpen: (step: ZineStep) => boolean;
	download: () => Promise<void>;
	reset: () => void;
};

/**
 * Estado do fluxo de criacao: capa, poesias, revisao e impressao.
 *
 * O rascunho vive aqui e e espelhado em `localStorage` a cada mudanca, entao
 * recarregar a pagina ou trocar de etapa nao perde o que ja foi escrito.
 */
export function useZineEditor(
	seedCover?: Cover,
	initialStep: ZineStep = "cover"
): ZineEditor {
	const [draft, setDraft] = useState<ZineDraft>(() => {
		const base = createDraft();
		return seedCover ? { ...base, cover: seedCover } : base;
	});
	const [ready, setReady] = useState(false);
	const storage = useRef<ReturnType<typeof browserStorage> | null>(null);

	useEffect(() => {
		storage.current = browserStorage();

		const stored = loadDraft(storage.current);

		if (stored) {
			setDraft(stored);
		} else if (isZineStep(initialStep)) {
			setDraft((prev) => ({ ...prev, step: initialStep }));
		}

		setReady(true);
		// O rascunho salvo vence o seed: recarregar nunca volta ao formulario vazio.
	}, [initialStep]);

	useEffect(() => {
		if (!ready) {
			return;
		}

		saveDraft(storage.current, draft);
	}, [draft, ready]);

	const update = useCallback(
		(transform: (current: ZineDraft) => ZineDraft): void => {
			setDraft((prev) => transform(prev));
		},
		[]
	);

	const cover = draft.cover;
	const doc = draft.doc;
	const poems = useMemo(() => poemPages(doc), [doc]);
	const formattedDate = useMemo(() => formatIsoDate(cover.date), [cover.date]);
	const issues = useMemo(() => draftIssues(draft), [draft]);
	const diagrammable = useMemo(() => isDraftDiagrammable(draft), [draft]);

	const setCoverField = (field: keyof Cover, value: string): void => {
		update((current) => ({
			...current,
			cover: { ...current.cover, [field]: value },
		}));
	};

	const setDate = (date: string): void => {
		setCoverField("date", date);
	};

	const setFormat = (format: ZineFormat): void => {
		update((current) => ({ ...current, format }));
	};

	const setPrintMode = (printMode: PrintMode): void => {
		update((current) => ({ ...current, printMode }));
	};

	const goToStep = (step: ZineStep): void => {
		update((current) =>
			canEnterStep(current, step) ? { ...current, step } : current
		);
	};

	const nextStep = (): void => {
		update((current) => {
			const index = stepIndex(current.step);
			const target = STEPS[index + 1];

			if (!target || !canEnterStep(current, target.id)) {
				return current;
			}

			return { ...current, step: target.id };
		});
	};

	const previousStep = (): void => {
		update((current) => {
			const index = stepIndex(current.step);
			const target = STEPS[index - 1];

			return target ? { ...current, step: target.id } : current;
		});
	};

	const changeField = (id: string, field: PageField, value: string): void => {
		update((current) => ({
			...current,
			doc: setPoemField(current.doc, id, field, value),
		}));
	};

	const addPoem = (): void => {
		update((current) => ({ ...current, doc: addPage(current.doc) }));
	};

	const removePoem = (id: string): void => {
		update((current) => ({
			...current,
			doc: removePage(current.doc, id),
		}));
	};

	const movePoem = (id: string, direction: -1 | 1): void => {
		update((current) => ({
			...current,
			doc: movePage(current.doc, id, direction),
		}));
	};

	const issuesOf = (step: ZineStep): DraftIssue[] =>
		issues.filter((issue) => issue.step === step);

	const statusOf = (step: ZineStep): StepStatus => stepStatus(draft, step);

	const canOpen = (step: ZineStep): boolean => canEnterStep(draft, step);

	const download = async (): Promise<void> => {
		if (!isFormatAvailable(draft.format)) {
			alert("Essa dobra ainda está em desenvolvimento. Em breve!");
			return;
		}

		const input: ZinePdfInput = {
			coverTitle: cover.title,
			authorName: cover.author,
			titleFont: cover.titleFont,
			authorFont: cover.authorFont,
			date: formattedDate,
			format: draft.format,
			printMode: draft.printMode,
			poems: poems.map((poem) => ({
				title: poem.title,
				subtitle: poem.subtitle,
				date: formatIsoDate(poem.date),
				body: poem.body,
			})),
		};

		const bytes = await generateZinePdf(input);
		const template = templateFor(draft.format);
		const mode = template
			? effectivePrintMode(template, draft.printMode)
			: draft.printMode;

		downloadBlob(bytes, `zine-${draft.format}-${mode}.pdf`);
	};

	const reset = (): void => {
		clearDraft(storage.current);
		setDraft(createDraft());
	};

	return {
		ready,
		step: draft.step,
		stepNumber: stepIndex(draft.step) + 1,
		totalSteps: STEPS.length,
		goToStep,
		nextStep,
		previousStep,
		cover,
		setCoverField,
		doc,
		poems,
		date: cover.date,
		setDate,
		formattedDate,
		format: draft.format,
		setFormat,
		printMode: draft.printMode,
		setPrintMode,
		changeField,
		addPoem,
		removePoem,
		movePoem,
		issues,
		issuesOf,
		statusOf,
		diagrammable,
		canOpen,
		download,
		reset,
	};
}
