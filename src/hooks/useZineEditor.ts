"use client";

import { useMemo, useState } from "react";
import type { Cover, PoemPage, PoemField, ZineDoc, ZineFormat } from "@/domain";
import {
	DEFAULT_FORMAT,
	addPage,
	createDoc,
	formatIsoDate,
	poemPages,
	removePage,
	setPoemField,
} from "@/domain";
import { downloadBlob } from "@/lib/download";
import type { ReadingPdfInput } from "@/lib/pdf";
import { generateReadingPdf } from "@/lib/pdf";

export type ZineEditor = {
	format: ZineFormat;
	setFormat: (format: ZineFormat) => void;
	doc: ZineDoc;
	poems: PoemPage[];
	/** Data ISO (yyyy-mm-dd). Vazia remove a data da capa. */
	date: string;
	setDate: (date: string) => void;
	/** Data em pt-BR, ou vazio quando a capa nao tem data. */
	formattedDate: string;
	changeField: (id: string, field: PoemField, value: string) => void;
	addPoem: () => void;
	removePoem: (id: string) => void;
	download: () => Promise<void>;
};

const UNIMPLEMENTED: Record<Exclude<ZineFormat, "reading">, string> = {
	"mini-zine": "O formato Minizine de 1 folha ainda está em desenvolvimento. Em breve!",
	"saddle-stitch": "O formato Fanzine grampeado ainda está em desenvolvimento. Em breve!",
};

export function useZineEditor(cover: Cover): ZineEditor {
	const [format, setFormat] = useState<ZineFormat>(DEFAULT_FORMAT);
	const [date, setDate] = useState<string>(cover.date);
	const [doc, setDoc] = useState<ZineDoc>(createDoc);

	const formattedDate = useMemo(() => formatIsoDate(date), [date]);
	const poems = useMemo(() => poemPages(doc), [doc]);

	const changeField = (id: string, field: PoemField, value: string): void => {
		setDoc((prev) => setPoemField(prev, id, field, value));
	};

	const addPoem = (): void => {
		setDoc((prev) => addPage(prev));
	};

	const removePoem = (id: string): void => {
		setDoc((prev) => removePage(prev, id));
	};

	const download = async (): Promise<void> => {
		if (format !== "reading") {
			alert(UNIMPLEMENTED[format]);
			return;
		}

		const input: ReadingPdfInput = {
			coverTitle: cover.title,
			authorName: cover.author,
			titleFont: cover.titleFont,
			authorFont: cover.authorFont,
			date: formattedDate,
			poems: poems.map((poem) => ({ title: poem.title, poetry: poem.poetry })),
		};

		const bytes = await generateReadingPdf(input);
		downloadBlob(bytes, "zine-leitura.pdf");
	};

	return {
		format,
		setFormat,
		doc,
		poems,
		date,
		setDate,
		formattedDate,
		changeField,
		addPoem,
		removePoem,
		download,
	};
}
