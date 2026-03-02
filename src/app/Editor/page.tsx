"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import { Suspense } from "react";
import { concatTransformationMatrix, PDFDocument, popGraphicsState, pushGraphicsState, rgb, StandardFonts } from 'pdf-lib';
import html2canvas from "html2canvas";

type PageContent = {
	title: string;
	poetry: string;
};

function EditorPage() {
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

	const generatePdfSinglePage = async () => {
		const pdfDoc = await PDFDocument.create();

		const pageWidth = 842;   // A4 landscape
		const pageHeight = 595;
		const margin = 10;

		const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

		const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

		// Todas as páginas internas (exceto capa)
		const internalPages = pageList
			.filter((n) => n !== 1)
			.map((n) => content[n] || { title: "", poetry: "" });

		// Garantir exatamente 8 páginas (preenchendo vazio se necessário)
		while (internalPages.length < 8) internalPages.push({ title: "", poetry: "" });

		const blockWidth = pageWidth / 4;
		const blockHeight = pageHeight / 2;

		internalPages.forEach((data, index) => {
			const col = index % 4;
			const row = Math.floor(index / 4);

			const offsetX = col * blockWidth;
			const offsetY = pageHeight - (row + 1) * blockHeight;

			const innerX = offsetX + margin;
			const innerY = offsetY + margin;
			const innerWidth = blockWidth - margin * 2;
			const innerHeight = blockHeight - margin * 2;

			// Borda
			pdfPage.drawRectangle({
				x: innerX,
				y: innerY,
				width: innerWidth,
				height: innerHeight,
				borderColor: rgb(0.7, 0.7, 0.7),
				borderWidth: 1,
			});

			const padding = 16;
			const isTopRow = row === 0;

			if (isTopRow) {
				// 🔄 Linha de cima: invertida 180°
				// Ponto de pivô: centro do bloco
				const cx = offsetX + blockWidth / 2;
				const cy = offsetY + blockHeight / 2;

				pdfPage.pushOperators(
					pushGraphicsState(),
					// Translada para o centro, rotaciona 180°, volta
					concatTransformationMatrix(-1, 0, 0, -1, cx * 2, cy * 2),
				);

				// Título (invertido)
				pdfPage.drawText(data.title || "", {
					x: innerX + padding,
					y: innerY + innerHeight - padding - 14, // começa do topo do bloco
					size: 14,
					font,
					maxWidth: innerWidth - padding * 2,
					lineHeight: 16,
				});

				// Poesia (invertida)
				pdfPage.drawText(data.poetry || "", {
					x: innerX + padding,
					y: innerY + innerHeight - padding - 14 - 25,
					size: 10,
					font,
					maxWidth: innerWidth - padding * 2,
					lineHeight: 12,
				});

				pdfPage.pushOperators(popGraphicsState());

			} else {
				// Linha de baixo: normal
				let cursorY = innerY + innerHeight - padding - 14;

				// Título com padding
				pdfPage.drawText(data.title || "", {
					x: innerX + padding,
					y: cursorY,
					size: 14,
					font,
					maxWidth: innerWidth - padding * 2,
					lineHeight: 16,
				});

				cursorY -= 25;

				// Poesia
				pdfPage.drawText(data.poetry || "", {
					x: innerX + padding,
					y: cursorY,
					size: 10,
					font,
					maxWidth: innerWidth - padding * 2,
					lineHeight: 12,
				});
			}
		});

		const pdfBytes = await pdfDoc.save();
		downloadBlob(pdfBytes, "zine-8paginas-uma-pagina.pdf");
	};

	const downloadBlob = (bytes: Uint8Array, filename: string) => {
		const blob = new Blob([bytes], { type: "application/pdf" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();

		URL.revokeObjectURL(url);
	};

	const generatePdf = async () => {
		const pdfDoc = await PDFDocument.create();

		// A4 landscape em pontos (pdf-lib usa pontos)
		const pageWidth = 842;   // A4 landscape width
		const pageHeight = 595;  // A4 landscape height
		const halfWidth = pageWidth / 2;

		const margin = 40;

		// Organizar páginas
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

		// Garantir múltiplo de 4
		while (allPages.length % 4 !== 0) {
			allPages.push({ title: "", poetry: "" });
		}

		const total = allPages.length;

		// Fonte padrão (por enquanto)
		const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

		const drawHalfPage = (
			page: any,
			data: { title: string; poetry: string },
			offsetX: number
		) => {
			let cursorY = pageHeight - margin;

			page.drawText(data.title || "", {
				x: offsetX + margin,
				y: cursorY,
				size: 18,
				font,
			});

			cursorY -= 30;

			page.drawText(data.poetry || "", {
				x: offsetX + margin,
				y: cursorY,
				size: 12,
				font,
				maxWidth: halfWidth - margin * 2,
				lineHeight: 16,
			});
		};

		// IMPOSIÇÃO
		for (let i = 0; i < total / 2; i++) {
			const page = pdfDoc.addPage([pageWidth, pageHeight]);

			let leftIndex, rightIndex;

			if (i % 2 === 0) {
				leftIndex = total - 1 - i;
				rightIndex = i;
			} else {
				leftIndex = i;
				rightIndex = total - 1 - i;
			}

			drawHalfPage(page, allPages[leftIndex], 0);
			drawHalfPage(page, allPages[rightIndex], halfWidth);
		}

		const pdfBytes = await pdfDoc.save();
		downloadBlob(pdfBytes, "zine-impressao.pdf");
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
						onClick={generatePdfSinglePage}
						className="bg-green-600 text-white px-6 py-2 rounded-full hover:opacity-90 transition"
					>
						Baixar Zine (PDF)
					</button>
				</nav>

			</div>

		</main>
	);
}


export default function EditorPageWrapper() {
	return (
		<Suspense fallback={<div>Carregando editor...</div>}>
			<EditorPage />
		</Suspense>
	);
}