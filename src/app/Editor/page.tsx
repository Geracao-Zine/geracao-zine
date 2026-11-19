"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { JSX } from "react";
import { Suspense } from "react";
import { FormatSelector, ZineFormat } from "@/components/FormatSelector";
import type { PoemField, ZineDoc } from "@/lib/zine-pages";
import { addPage, createDoc, poemPages, removePage, setPoemField } from "@/lib/zine-pages";
import type { FontId } from "@/lib/fonts";
import { fontById, resolveFontId } from "@/lib/fonts";
import { generateReadingPdf } from "@/lib/pdf";
import type { ReadingPdfInput } from "@/lib/pdf";

function EditorPage(): JSX.Element {
	const searchParams = useSearchParams();

	const coverTitle = searchParams.get("coverTitle") || "";
	const authorName = searchParams.get("authorName") || "";
	const titleFontId: FontId = resolveFontId(searchParams.get("titleFont"));
	const authorFontId: FontId = resolveFontId(searchParams.get("authorFont"));

	const titleFontClass = fontById(titleFontId).className;
	const authorFontClass = fontById(authorFontId).className;

	// 🔽 default agora é "reading", que é o único formato disponível
	const [format, setFormat] = useState<ZineFormat>("reading");

	const [date] = useState<number>(() => Date.now());

	const formattedDate = useMemo(() => new Date(date).toLocaleDateString("pt-BR"), [date]);

	const [doc, setDoc] = useState<ZineDoc>(createDoc);

	const pages = doc.pages;
	const poems = useMemo(() => poemPages(doc), [doc]);

	const handleChange = (
		id: string,
		field: PoemField,
		value: string
	): void => {
		setDoc((prev) => setPoemField(prev, id, field, value));
	};

	const handleAddPage = (): void => {
		setDoc((prev) => addPage(prev));
	};

	const handleRemovePage = (id: string): void => {
		setDoc((prev) => removePage(prev, id));
	};

	const downloadBlob = (bytes: Uint8Array, filename: string): void => {
		const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();

		URL.revokeObjectURL(url);
	};

	const generatePdfReading = async (): Promise<void> => {
		const input: ReadingPdfInput = {
			coverTitle,
			authorName,
			titleFont: titleFontId,
			authorFont: authorFontId,
			date: formattedDate,
			poems: poems.map((poem) => ({ title: poem.title, poetry: poem.poetry })),
		};

		const bytes = await generateReadingPdf(input);
		downloadBlob(bytes, "zine-leitura.pdf");
	};

	// 🚧 Placeholders para os formatos ainda não implementados
	const generatePdfMiniZine = async (): Promise<void> => {
		alert("O formato Minizine de 1 folha ainda está em desenvolvimento. Em breve!");
	};

	const generatePdfSaddleStitch = async (): Promise<void> => {
		alert("O formato Fanzine grampeado ainda está em desenvolvimento. Em breve!");
	};

	// 🔀 Dispatcher: decide qual geração rodar baseado no formato escolhido
	const generators: Record<ZineFormat, () => Promise<void>> = {
		reading: generatePdfReading,
		"mini-zine": generatePdfMiniZine,
		"saddle-stitch": generatePdfSaddleStitch,
	};

	const handleGeneratePdf = async (): Promise<void> => {
		const generator = generators[format];
		await generator();
	};

	return (
		<main className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 p-10">
			<FormatSelector value={format} onChange={setFormat} />

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

				{pages.map((page) => {

					if (page.kind === "cover") {
						return (
							<div
								key={page.id}
								className="bg-gradient-to-br from-purple-600 to-purple-900 text-white shadow-2xl rounded-2xl aspect-[3/4] flex flex-col justify-between p-8"
							>
								<div className="flex-1 flex items-center justify-center text-center">
									<h1 className={`text-4xl font-bold leading-tight ${titleFontClass}`}>
										{coverTitle}
									</h1>
								</div>

								<div className="space-y-2">
									<p className={`text-lg ${authorFontClass}`}>{authorName}</p>
									<p className="text-sm opacity-80">{formattedDate}</p>
								</div>
							</div>
						);
					}

					const position = poems.findIndex((poem) => poem.id === page.id) + 1;

					return (
						<div
							key={page.id}
							className="bg-white dark:bg-zinc-900 shadow-xl rounded-2xl aspect-[3/4] border border-zinc-200 dark:border-zinc-800 flex flex-col p-6 relative"
						>
							<button
								onClick={() => handleRemovePage(page.id)}
								className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition text-[1rem] cursor-pointer"
							>
								❌
							</button>

							<input
								type="text"
								placeholder="Título da página"
								value={page.title}
								onChange={(e) => handleChange(page.id, "title", e.target.value)}
								className="text-xl font-semibold bg-transparent border-b border-zinc-300 dark:border-zinc-700 outline-none mb-4 pb-2 focus:border-purple-600"
							/>

							<textarea
								placeholder="Escreva sua poesia aqui..."
								value={page.poetry}
								onChange={(e) => handleChange(page.id, "poetry", e.target.value)}
								className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed"
							/>

							<div className="text-center text-xs text-zinc-400 mt-4">
								{position}
							</div>
						</div>
					);
				})}

				<nav className="mb-8 flex flex-col md:flex-row gap-2 justify-between lg:col-span-3">
					<button
						onClick={handleAddPage}
						className="bg-purple-600 text-white px-6 py-2 rounded-full hover:opacity-90 transition"
					>
						➕ Adicionar Página
					</button>
					<button
						onClick={handleGeneratePdf}
						className="bg-green-600 text-white px-6 py-2 rounded-full hover:opacity-90 transition"
					>
						Baixar Zine (PDF)
					</button>
				</nav>
			</div>
		</main>
	);
}

export default function EditorPageWrapper(): JSX.Element {
	return (
		<Suspense fallback={<div>Carregando editor...</div>}>
			<EditorPage />
		</Suspense>
	);
}