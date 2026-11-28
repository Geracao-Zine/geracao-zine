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
	ShapeBlock,
	ShapeBlockPatch,
	ShapeKind,
	TextBlock,
	TextBlockKind,
} from "@/domain";
import {
	STEPS,
	addShapeBlock,
	addPage,
	addTextBlock as appendTextBlock,
	canEnterStep,
	createDraft,
	draftIssues,
	formatIsoDate,
	isDraftDiagrammable,
	isFormatAvailable,
	isZineStep,
	movePage,
	moveTextBlockLayer,
	nextTextBlockZ,
	poemPages,
	removeShapeBlock,
	removePage,
	removeTextBlock,
	setPoemBlocks,
	setPoemField,
	setPoemShapes,
	updateShapeBlock,
	updateTextBlock,
	toggleTextBlockLock,
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
import { pageImageFrom } from "@/domain";
import type { ZinePdfInput } from "@/lib/pdf";
import { forcedPrintMode, generateZinePdf, mmToPt, templateFor } from "@/lib/pdf";
import { previewPanelFor } from "@/lib/preview";
import { LOCAL_SAVE_MS, debounce } from "@/lib/debounce";
import { useSalvarNaConta } from "@/hooks/useSalvarNaConta";
import { draftDoZine, obterZine } from "@/lib/zines/client";
import type { SalvarNaConta } from "@/hooks/useSalvarNaConta";
import { useSession } from "@/hooks/useSession";

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
	addPoemBlock: (id: string, kind: TextBlockKind) => void;
	changePoemBlockText: (id: string, blockId: string, text: string) => void;
	removePoemBlock: (id: string, blockId: string) => void;
	movePoemBlockLayer: (
		id: string,
		blockId: string,
		direction: "front" | "back"
	) => void;
	togglePoemBlockLock: (id: string, blockId: string) => void;
	changePoemBlocks: (id: string, blocks: TextBlock[]) => void;
	addPoemShape: (id: string, kind: ShapeKind) => void;
	removePoemShape: (id: string, shapeId: string) => void;
	changePoemShape: (id: string, shapeId: string, patch: ShapeBlockPatch) => void;
	changePoemShapes: (id: string, shapes: ShapeBlock[]) => void;
	issues: DraftIssue[];
	issuesOf: (step: ZineStep) => DraftIssue[];
	statusOf: (step: ZineStep) => StepStatus;
	diagrammable: boolean;
	canOpen: (step: ZineStep) => boolean;
	download: () => Promise<void>;
	reset: () => void;
	/** Espelhamento do rascunho na conta, quando ha sessao. */
	conta: SalvarNaConta;
	/** Mensagem quando o zine pedido nao pode ser aberto. */
	erroAbertura: string | null;
};

/**
 * Estado do fluxo de criacao: capa, poesias, revisao e impressao.
 *
 * O rascunho vive aqui e e espelhado em `localStorage` a cada mudanca, entao
 * recarregar a pagina ou trocar de etapa nao perde o que ja foi escrito.
 */
export function useZineEditor(
	seedCover?: Cover,
	initialStep: ZineStep = "cover",
	zineId?: string
): ZineEditor {
	const [draft, setDraft] = useState<ZineDraft>(() => {
		const base = createDraft();
		return seedCover ? { ...base, cover: seedCover } : base;
	});
	// `ready` e derivado: sem `zineId` o rascunho local ja esta disponivel na
	// primeira pintura; com ele, so depois que o zine da conta chega.
	const [idCarregado, setIdCarregado] = useState<string | null>(null);
	const ready = zineId === undefined || idCarregado === zineId;
	const [erroAbertura, setErroAbertura] = useState<string | null>(null);
	// Imagens vivem fora do rascunho: nao sao serializadas e somem ao
	// recarregar. O rascunho guarda so o que e texto.
	const [images, setImages] = useState<Record<string, PageImage>>({});
	const storage = useRef<ReturnType<typeof browserStorage> | null>(null);
	const localAgendado = useRef<ReturnType<typeof debounce<[ZineDraft]>> | null>(null);

	useEffect(() => {
		storage.current = browserStorage();
		// Recriar o agendador descartaria um pendente: libera antes.
		localAgendado.current?.liberar();
		localAgendado.current = debounce<[ZineDraft]>(
			(alvo) => saveDraft(storage.current, alvo),
			LOCAL_SAVE_MS
		);

		// Abrir um zine da conta nao le o rascunho local: senao o que estava
		// neste navegador venceria o zine que a pessoa clicou.
		if (zineId) {
			return;
		}

		const stored = loadDraft(storage.current);

		if (stored) {
			setDraft(stored);
		} else if (isZineStep(initialStep)) {
			setDraft((prev) => ({ ...prev, step: initialStep }));
		}

		// O rascunho salvo vence o seed: recarregar nunca volta ao formulario vazio.
	}, [initialStep, zineId]);

	// Gravar a cada tecla serializa o documento inteiro por caractere. O debounce
	// corta isso, mas so e seguro porque o pendente e liberado ao sair ou
	// esconder a aba: fechar o navegador nao pode custar o rascunho.
	useEffect(() => {
		if (!ready) {
			return;
		}

		localAgendado.current?.agendar(draft);
	}, [draft, ready]);

	useEffect(() => {
		const liberar = (): void => {
			localAgendado.current?.liberar();
		};
		const aoEsconder = (): void => {
			if (document.visibilityState === "hidden") {
				liberar();
			}
		};

		window.addEventListener("pagehide", liberar);
		document.addEventListener("visibilitychange", aoEsconder);

		return () => {
			window.removeEventListener("pagehide", liberar);
			document.removeEventListener("visibilitychange", aoEsconder);
			liberar();
		};
	}, []);

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

		// Passa pela normalizacao do dominio, o mesmo caminho de um `PageImage`
		// vindo de JSON: campo faltando cai no padrao em vez de virar undefined.
		const imagem = pageImageFrom({
			assetId,
			naturalWidth: tamanho.width,
			naturalHeight: tamanho.height,
		});

		if (!imagem) {
			return;
		}

		setImages((prev) => ({ ...prev, [id]: imagem }));
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

	const addPoemBlock = (id: string, kind: TextBlockKind): void => {
		update((current) => {
			const poem = poemPages(current.doc).find((page) => page.id === id);

			if (!poem) {
				return current;
			}

			const panel = previewPanelFor(current.format);
			const blocks = appendTextBlock(poem.blocks ?? [], kind, {
				...panel,
				inset: mmToPt(current.safetyMargin),
			}).map((block, index, all) =>
				index === all.length - 1
					? { ...block, font: current.cover.titleFont }
					: block
			);

			return {
				...current,
				doc: setPoemBlocks(current.doc, id, blocks),
			};
		});
	};

	const changePoemBlockText = (
		id: string,
		blockId: string,
		text: string
	): void => {
		update((current) => {
			const poem = poemPages(current.doc).find((page) => page.id === id);

			if (!poem) {
				return current;
			}

			return {
				...current,
				doc: setPoemBlocks(
					current.doc,
					id,
					updateTextBlock(poem.blocks ?? [], blockId, { text })
				),
			};
		});
	};

	const removePoemBlock = (id: string, blockId: string): void => {
		update((current) => {
			const poem = poemPages(current.doc).find((page) => page.id === id);

			if (!poem) {
				return current;
			}

			return {
				...current,
				doc: setPoemBlocks(
					current.doc,
					id,
					removeTextBlock(poem.blocks ?? [], blockId)
				),
			};
		});
	};

	const movePoemBlockLayer = (
		id: string,
		blockId: string,
		direction: "front" | "back"
	): void => {
		update((current) => {
			const poem = poemPages(current.doc).find((page) => page.id === id);

			if (!poem) {
				return current;
			}

			return {
				...current,
				doc: setPoemBlocks(
					current.doc,
					id,
					moveTextBlockLayer(poem.blocks ?? [], blockId, direction)
				),
			};
		});
	};

	const togglePoemBlockLock = (id: string, blockId: string): void => {
		update((current) => {
			const poem = poemPages(current.doc).find((page) => page.id === id);

			if (!poem) {
				return current;
			}

			return {
				...current,
				doc: setPoemBlocks(
					current.doc,
					id,
					toggleTextBlockLock(poem.blocks ?? [], blockId)
				),
			};
		});
	};

	const addPoemShape = (id: string, kind: ShapeKind): void => {
		update((current) => {
			const poem = poemPages(current.doc).find((page) => page.id === id);

			if (!poem) {
				return current;
			}

			const panel = previewPanelFor(current.format);
			const shapes = addShapeBlock(poem.shapes ?? [], kind, {
				...panel,
				inset: mmToPt(current.safetyMargin),
			}, nextTextBlockZ(poem.blocks ?? []));

			return { ...current, doc: setPoemShapes(current.doc, id, shapes) };
		});
	};

	const removePoemShape = (id: string, shapeId: string): void => {
		update((current) => {
			const poem = poemPages(current.doc).find((page) => page.id === id);

			if (!poem) {
				return current;
			}

			return {
				...current,
				doc: setPoemShapes(current.doc, id, removeShapeBlock(poem.shapes ?? [], shapeId)),
			};
		});
	};

	const changePoemShape = (
		id: string,
		shapeId: string,
		patch: ShapeBlockPatch
	): void => {
		update((current) => {
			const poem = poemPages(current.doc).find((page) => page.id === id);

			if (!poem) {
				return current;
			}

			return {
				...current,
				doc: setPoemShapes(
					current.doc,
					id,
					updateShapeBlock(poem.shapes ?? [], shapeId, patch)
				),
			};
		});
	};

	const changePoemShapes = (id: string, shapes: ShapeBlock[]): void => {
		update((current) => ({ ...current, doc: setPoemShapes(current.doc, id, shapes) }));
	};

	const changePoemBlocks = (id: string, blocks: TextBlock[]): void => {
		update((current) => ({
			...current,
			doc: setPoemBlocks(current.doc, id, blocks),
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
				blocks: poem.blocks,
				shapes: poem.shapes,
				image: images[poem.id] ?? null,
			})),
			images: imageBytesFor(images),
		};

		const bytes = await generateZinePdf(input);
		downloadBlob(bytes, `zine-${draft.format}-${printMode}.pdf`);
	};

	// So espelha na conta depois de ler o rascunho do navegador: antes disso o
	// estado inicial vazio sobrescreveria o zine salvo.
	const { sessao } = useSession();
	const conta = useSalvarNaConta(draft, sessao.status === "autenticado", ready);

	// Ajuste em tempo de render: quando a URL passa a apontar para o zine que este
	// editor acabou de criar, ele ja esta carregado e nao precisa de novo GET.
	if (zineId !== undefined && zineId === conta.zineId && idCarregado !== zineId) {
		setIdCarregado(zineId);
	}

	// O primeiro salvamento cria o zine e o id passa a ir na URL. Sem isso,
	// recarregar a pagina voltaria a "rascunho local" e o proximo salvamento
	// criaria outro zine para o mesmo texto: foi assim que a aba "Meus zines"
	// encheu de duplicatas.
	const idNaUrl = useRef<string | null>(null);

	useEffect(() => {
		if (!conta.zineId || conta.zineId === idNaUrl.current) {
			return;
		}

		idNaUrl.current = conta.zineId;

		const url = new URL(window.location.href);
		url.searchParams.set("zine", conta.zineId);
		window.history.replaceState(null, "", url.toString());
	}, [conta.zineId]);

	// Abrir um zine da conta: busca, converte em rascunho e assume o id para os
	// proximos salvamentos atualizarem este zine em vez de criar outro.
	useEffect(() => {
		if (!zineId) {
			return;
		}

		// A URL aponta para o zine que este editor acabou de criar: ele ja esta
		// carregado, e buscar de novo sobrescreveria o rascunho em digitacao pela
		// copia do banco. `idCarregado` ja foi ajustado no render.
		if (zineId === conta.zineId) {
			return;
		}

		let vivo = true;

		void obterZine(zineId).then((resultado) => {
			if (!vivo) {
				return;
			}

			if (!resultado.ok) {
				setErroAbertura(resultado.motivo);
				setIdCarregado(zineId);
				return;
			}

			const aberto = draftDoZine(resultado.zine);

			if (!aberto) {
				// JSON de uma versao que o dominio nao entende: abrir vazio faria a
				// proxima gravacao apagar o conteudo do autor.
				setErroAbertura("Este zine nao pode ser aberto no editor.");
				setIdCarregado(zineId);
				return;
			}

			setDraft(aberto);
			conta.adotar(resultado.zine.id, aberto, resultado.zine.visibility);
			setIdCarregado(zineId);
		});

		return () => {
			vivo = false;
		};
		// `conta.adotar` e estavel; incluir `conta` recriaria o efeito a cada gravacao.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [zineId]);

	const reset = (): void => {
		clearDraft(storage.current);
		conta.desvincular();
		setDraft(createDraft());
	};

	return {
		ready,
		erroAbertura,
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
		addPoemBlock,
		changePoemBlockText,
		removePoemBlock,
		movePoemBlockLayer,
		togglePoemBlockLock,
		changePoemBlocks,
		addPoemShape,
		removePoemShape,
		changePoemShape,
		changePoemShapes,
		issues,
		issuesOf,
		statusOf,
		diagrammable,
		canOpen,
		download,
		reset,
		conta,
	};
}
