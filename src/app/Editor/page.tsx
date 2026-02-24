"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import jsPDF from "jspdf";

type PageContent = {
	title: string;
	poetry: string;
};

export default function EditorPage() {
	const searchParams = useSearchParams();

	const initialPages = Number(searchParams.get("pages")) || 0;
	const coverTitle = searchParams.get("coverTitle") || "";
	const authorName = searchParams.get("authorName") || "";
	const titleFont = searchParams.get("titleFont") || "font-sans";
	const authorFont = searchParams.get("authorFont") || "font-sans";
	const date = searchParams.get("date");

	const formattedDate = useMemo(() => {
		if (!date) return "";
		return new Date(date).toLocaleDateString("pt-BR");
	}, [date]);

	const [pageList, setPageList] = useState<number[]>(
		Array.from({ length: initialPages }, (_, i) => i + 1)
	);

	const [content, setContent] = useState<Record<number, PageContent>>({});

	const handleChange = (
		page: number,
		field: "title" | "poetry",
		value: string
	) => {
		setContent((prev) => ({
			...prev,
			[page]: {
				...prev[page],
				[field]: value,
			},
		}));
	};

	const addPage = () => {
		setPageList((prev) => [...prev, prev.length + 1]);
	};

	const removePage = (pageNumber: number) => {
		if (pageNumber === 1) return;

		setPageList((prev) => {
			const updated = prev.filter((p) => p !== pageNumber);

			//  Reorganiza numeração
			return updated.map((_, index) => index + 1);
		});

		setContent((prev) => {
			const newContent: Record<number, PageContent> = {};
			const updatedPages = pageList
				.filter((p) => p !== pageNumber)
				.map((_, index) => index + 1);

			updatedPages.forEach((newNumber, index) => {
				const oldNumber = pageList.filter((p) => p !== pageNumber)[index];
				if (prev[oldNumber]) {
					newContent[newNumber] = prev[oldNumber];
				}
			});

			return newContent;
		});
	};


	const downloadZine = () => {
		const doc = new jsPDF({
			orientation: "landscape",
			unit: "mm",
			format: "a4",
		});

		const pageWidth = 148; // metade do A4 paisagem
		const pageHeight = 210;
		const margin = 15;

		// Organiza todas as páginas
		let allPages: { title: string; poetry: string }[] = [];

		// Capa
		allPages.push({
			title: coverTitle,
			poetry: `${authorName}\n${formattedDate}`,
		});

		// Internas
		pageList.forEach((pageNumber) => {
			if (pageNumber === 1) return;
			const pageData = content[pageNumber];
			allPages.push({
				title: pageData?.title || "",
				poetry: pageData?.poetry || "",
			});
		});

		// 🔹 Garante múltiplo de 4
		while (allPages.length % 4 !== 0) {
			allPages.push({ title: "", poetry: "" });
		}

		const total = allPages.length;

		// 🔹 Função para desenhar uma página
		const drawPage = (
			data: { title: string; poetry: string },
			offsetX: number
		) => {
			doc.setFontSize(16);
			doc.text(data.title || "", offsetX + margin, 40);

			doc.setFontSize(12);
			const split = doc.splitTextToSize(
				data.poetry || "",
				pageWidth - margin * 2
			);

			doc.text(split, offsetX + margin, 55);
		};

		// IMPOSIÇÃO DE PÁGINAS (ordem correta)
		for (let i = 0; i < total / 2; i++) {
			if (i > 0) doc.addPage();

			let leftIndex, rightIndex;

			if (i % 2 === 0) {
				leftIndex = total - 1 - i;
				rightIndex = i;
			} else {
				leftIndex = i;
				rightIndex = total - 1 - i;
			}

			drawPage(allPages[leftIndex], 0);
			drawPage(allPages[rightIndex], pageWidth);
		}

		doc.save("zine-impressao.pdf");
	};

	return (
		<main className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 p-10">

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

				{pageList.map((pageNumber) => {

					//  CAPA
					if (pageNumber === 1) {
						return (
							<div
								key={pageNumber}
								className="
									bg-gradient-to-br 
									from-purple-600 
									to-purple-900
									text-white
									shadow-2xl
									rounded-2xl
									aspect-[3/4]
									flex flex-col
									justify-between
									p-8
								"
							>
								<div>
									<h1 className={`text-4xl font-bold leading-tight ${titleFont}`}>
										{coverTitle}
									</h1>
								</div>

								<div className="space-y-2">
									<p className={`text-lg ${authorFont}`}>
										{authorName}
									</p>
									<p className="text-sm opacity-80">
										{formattedDate}
									</p>
								</div>
							</div>
						);
					}

					const pageData = content[pageNumber] || {
						title: "",
						poetry: "",
					};

					return (
						<div
							key={pageNumber}
							className="
								bg-white dark:bg-zinc-900
								shadow-xl
								rounded-2xl
								aspect-[3/4]
								border border-zinc-200 dark:border-zinc-800
								flex flex-col
								p-6
								relative
							"
						>
							{/* 🗑 BOTÃO EXCLUIR */}
							<button
								onClick={() => removePage(pageNumber)}
								className="
									absolute top-3 right-3
									text-zinc-400 hover:text-red-500
									transition text-[1rem]
									cursor-pointer
								"
							>
								❌
							</button>

							<input
								type="text"
								placeholder="Título da página"
								value={pageData.title}
								onChange={(e) =>
									handleChange(pageNumber, "title", e.target.value)
								}
								className="
									text-xl font-semibold
									bg-transparent
									border-b border-zinc-300 dark:border-zinc-700
									outline-none
									mb-4
									pb-2
									focus:border-purple-600
								"
							/>

							<textarea
								placeholder="Escreva sua poesia aqui..."
								value={pageData.poetry}
								onChange={(e) =>
									handleChange(pageNumber, "poetry", e.target.value)
								}
								className="
									flex-1
									resize-none
									bg-transparent
									outline-none
									text-sm
									leading-relaxed
								"
							/>

							<div className="text-center text-xs text-zinc-400 mt-4">
								{pageNumber}
							</div>
						</div>

					);
				})}


				<nav className="mb-8 flex flex-col md:flex-row gap-2 justify-between lg:col-span-3">
					<button
						onClick={addPage}
						className="bg-purple-600 text-white px-6 py-2 rounded-full hover:opacity-90 transition"
					>
						➕ Adicionar Página
					</button>
					<button
						onClick={downloadZine}
						className="bg-green-600 text-white px-6 py-2 rounded-full hover:opacity-90 transition"
					>
						Baixar Zine (PDF)
					</button>
				</nav>

			</div>

		</main>
	);
}