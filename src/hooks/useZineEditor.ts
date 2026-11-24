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
	EMPTY_IMAGE_OFFSET,
	EMPTY_IMAGE_SCALE,
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
	safetyMarginFrom,
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
import { naturalSize } from "@/lib/image-file";
import { imageBytesFor, putImage } from "@/lib/image-store";
import type { PageImage } from "@/domain";
import type { ZinePdfInput } from "@/lib/pdf";
import { forcedPrintMode, generateZinePdf, mmToPt, templateFor } from "@/lib/pdf";

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
	/** Modo efetivo do PDF; nas dobras fixas ignora a escolha do autor. */
	printMode: PrintMode;
	/** Verdadeiro quando a dobra obriga simplex ou duplex. */
	printModeLocked: boolean;
	setPrintMode: (mode: PrintMode) => void;
	/** Marcas de corte e dobra no PDF. */
	marks: boolean;
	setMarks: (marks: boolean) => void;
	/** Margem de seguranca dentro dos paineis, em milimetros. */
	safetyMargin: number;
	setSafetyMargin: (mm: number) => void;
	/** A mesma margem em pontos, para o preview medir igual ao PDF. */
	safetyMarginPt: number;
	changeField: (id: string, field: PageField, value: string) => void;
	/** Imagem de cada poema, so em memoria: nao vai para o rascunho. */
	images: Record<string, PageImage>;
	setPoemImage: (id: string, file: File) => Promise<void>;
	clearPoemImage: (id: string) => void;
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
	// Imagens vivem fora do rascunho: nao sao serializadas e somem ao
	// recarregar. O rascunho guarda so o que e texto.
	const [images, setImages] = useState<Record<string, PageImage>>({});
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
	const template = templateFor(draft.format);
	const forcedMode = template ? forcedPrintMode(template) : null;
	const printMode = forcedMode ?? draft.printMode;

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

	const setMarks = (marks: boolean): void => {
		update((current) => ({ ...current, marks }));
	};

	const setSafetyMargin = (safetyMargin: number): void => {
		update((current) => ({ ...current, safetyMargin: safetyMarginFrom(safetyMargin) }));
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

	/**
	 * Le o arquivo para a memoria da sessao e associa a imagem ao poema.
	 *
	 * O tamanho natural e lido do proprio arquivo, porque o layout precisa
	 * dele para encaixar sem esticar. Arquivo invalido nao mexe no estado.
	 */
	const setPoemImage = async (id: string, file: File): Promise<void> => {
		const bytes = new Uint8Array(await file.arrayBuffer());
		const tamanho = naturalSize(bytes);

		if (!tamanho) {
			alert("Não foi possível ler a imagem. Use PNG ou JPEG.");
			return;
		}

		const assetId = putImage(bytes, file.type);

		setImages((prev) => ({
			...prev,
			[id]: {
				assetId,
				naturalWidth: tamanho.width,
				naturalHeight: tamanho.height,
				scale: EMPTY_IMAGE_SCALE,
				offsetX: EMPTY_IMAGE_OFFSET,
				offsetY: EMPTY_IMAGE_OFFSET,
			},
		}));
	};

	const clearPoemImage = (id: string): void => {
		setImages((prev) => {
			const next = { ...prev };
			delete next[id];

			return next;
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
			printMode,
			marks: draft.marks,
			safetyMarginMm: draft.safetyMargin,
			poems: poems.map((poem) => ({
				title: poem.title,
				subtitle: poem.subtitle,
				date: formatIsoDate(poem.date),
				body: poem.body,
				image: images[poem.id] ?? null,
			})),
			images: imageBytesFor(images),
		};

		const bytes = await generateZinePdf(input);
		downloadBlob(bytes, `zine-${draft.format}-${printMode}.pdf`);
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
		printMode,
		printModeLocked: forcedMode !== null,
		setPrintMode,
		marks: draft.marks,
		setMarks,
		safetyMargin: draft.safetyMargin,
		setSafetyMargin,
		safetyMarginPt: mmToPt(draft.safetyMargin),
		changeField,
		images,
		setPoemImage,
		clearPoemImage,
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
