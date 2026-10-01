"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Suspense } from "react";
import { PDFDocument, StandardFonts, concatTransformationMatrix, popGraphicsState, pushGraphicsState, rgb } from 'pdf-lib';
import { FormatSelector, ZineFormat } from "@/components/FormatSelector";

type PageContent = {
	title: string;
	poetry: string;
};

function EditorPage() {
	const searchParams = useSearchParams();

	const coverTitle = searchParams.get("coverTitle") || "";
	const authorName = searchParams.get("authorName") || "";
	const titleFont = searchParams.get("titleFont") || "font-sans";
	const authorFont = searchParams.get("authorFont") || "font-sans";
	const date = Date.now();

	// 🔽 default agora é "reading", que é o único formato disponível
	const [format, setFormat] = useState<ZineFormat>("reading");

	const formattedDate = useMemo(() => {
		if (!date) return "";
		return new Date(date).toLocaleDateString("pt-BR");
	}, [date]);

	const [pageList, setPageList] = useState<number[]>(
		Array.from({ length: 2 }, (_, i) => i + 1)
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

	const downloadBlob = (bytes: Uint8Array, filename: string) => {
		const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();

		URL.revokeObjectURL(url);
	};

	// ✅ ÚNICO FORMATO ATIVO: geração simples, uma página por poema// Helper: quebra texto respeitando \n explícitos e o maxWidth
	function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
		const paragraphs = text.split("\n");
		const lines: string[] = [];

		paragraphs.forEach((para) => {
			if (para.trim() === "") {
				lines.push("");
				return;
			}
			const words = para.split(" ");
			let currentLine = "";

			words.forEach((word) => {
				const testLine = currentLine ? `${currentLine} ${word}` : word;
				const width = font.widthOfTextAtSize(testLine, fontSize);

				if (width > maxWidth && currentLine) {
					lines.push(currentLine);
					currentLine = word;
				} else {
					currentLine = testLine;
				}
			});

			if (currentLine) lines.push(currentLine);
		});

		return lines;
	}

	const generatePdfReading = async () => {
		const pdfDoc = await PDFDocument.create();
		const pageWidth = 595;   // A4 retrato
		const pageHeight = 842;
		const margin = 70;
		const contentWidth = pageWidth - margin * 2;

		const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
		const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
		const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

		// ---------- CAPA ----------
		const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);

		const titleFontSize = 30;
		const titleLineHeight = 38;
		const titleLines = wrapText(coverTitle || "", boldFont, titleFontSize, contentWidth);

		const authorFontSize = 14;
		const dateFontSize = 10;
		const gapTitleToAuthor = 40;
		const gapAuthorToDate = 10;

		const titleBlockHeight = titleLines.length * titleLineHeight;
		const authorBlockHeight = authorFontSize + gapAuthorToDate + dateFontSize;
		const totalBlockHeight = titleBlockHeight + gapTitleToAuthor + authorBlockHeight;

		// Centraliza o bloco inteiro verticalmente na página
		let cursorY = pageHeight / 2 + totalBlockHeight / 2;

		titleLines.forEach((line) => {
			const lineWidth = boldFont.widthOfTextAtSize(line, titleFontSize);
			coverPage.drawText(line, {
				x: (pageWidth - lineWidth) / 2,
				y: cursorY,
				size: titleFontSize,
				font: boldFont,
			});
			cursorY -= titleLineHeight;
		});

		// Linha decorativa
		cursorY -= gapTitleToAuthor / 2;
		const dividerWidth = 60;
		coverPage.drawLine({
			start: { x: (pageWidth - dividerWidth) / 2, y: cursorY },
			end: { x: (pageWidth + dividerWidth) / 2, y: cursorY },
			thickness: 1,
			color: rgb(0.6, 0.6, 0.6),
		});
		cursorY -= gapTitleToAuthor / 2;

		if (authorName) {
			const authorWidth = font.widthOfTextAtSize(authorName, authorFontSize);
			coverPage.drawText(authorName, {
				x: (pageWidth - authorWidth) / 2,
				y: cursorY,
				size: authorFontSize,
				font,
			});
			cursorY -= gapAuthorToDate + dateFontSize;
		}

		const dateWidth = font.widthOfTextAtSize(formattedDate, dateFontSize);
		coverPage.drawText(formattedDate, {
			x: (pageWidth - dateWidth) / 2,
			y: cursorY,
			size: dateFontSize,
			font,
			color: rgb(0.5, 0.5, 0.5),
		});

		// ---------- PÁGINAS DE POEMA ----------
		const poemTitleSize = 20;
		const poemBodySize = 13;
		const poemLineHeight = 22;
		const topStart = pageHeight - margin;
		const bottomLimit = margin;

		pageList
			.filter((n) => n !== 1)
			.forEach((n) => {
				const data = content[n] || { title: "", poetry: "" };

				let page = pdfDoc.addPage([pageWidth, pageHeight]);
				let y = topStart;

				// Título do poema
				const titleLinesPoem = wrapText(data.title || "", boldFont, poemTitleSize, contentWidth);
				titleLinesPoem.forEach((line) => {
					page.drawText(line, {
						x: margin,
						y,
						size: poemTitleSize,
						font: boldFont,
					});
					y -= poemTitleSize + 6;
				});

				// Linha divisória sob o título
				y -= 6;
				page.drawLine({
					start: { x: margin, y },
					end: { x: pageWidth - margin, y },
					thickness: 0.5,
					color: rgb(0.75, 0.75, 0.75),
				});
				y -= 30;

				// Corpo do poema, com quebra automática de página se necessário
				const bodyLines = wrapText(data.poetry || "", italicFont, poemBodySize, contentWidth);

				bodyLines.forEach((line) => {
					if (y < bottomLimit) {
						// Não cabe mais: cria nova página e continua
						page = pdfDoc.addPage([pageWidth, pageHeight]);
						y = topStart;
					}

					if (line === "") {
						y -= poemLineHeight / 2; // linha em branco entre estrofes
						return;
					}

					page.drawText(line, {
						x: margin,
						y,
						size: poemBodySize,
						font: italicFont,
						color: rgb(0.15, 0.15, 0.15),
					});
					y -= poemLineHeight;
				});
			});

		const pdfBytes = await pdfDoc.save();
		downloadBlob(pdfBytes, "zine-leitura.pdf");
	};
	
	// 🚧 Placeholders para os formatos ainda não implementados
	const generatePdfMiniZine = async () => {
		alert("O formato Minizine de 1 folha ainda está em desenvolvimento. Em breve!");
	};

	const generatePdfSaddleStitch = async () => {
		alert("O formato Fanzine grampeado ainda está em desenvolvimento. Em breve!");
	};

	// 🔀 Dispatcher: decide qual geração rodar baseado no formato escolhido
	const generators: Record<ZineFormat, () => Promise<void>> = {
		reading: generatePdfReading,
		"mini-zine": generatePdfMiniZine,
		"saddle-stitch": generatePdfSaddleStitch,
	};

	const handleGeneratePdf = async () => {
		const generator = generators[format];
		await generator();
	};

	return (
		<main className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 p-10">
			<FormatSelector value={format} onChange={setFormat} />

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

				{pageList.map((pageNumber) => {

					if (pageNumber === 1) {
						return (
							<div
								key={pageNumber}
								className="bg-gradient-to-br from-purple-600 to-purple-900 text-white shadow-2xl rounded-2xl aspect-[3/4] flex flex-col justify-between p-8"
							>
								<div className="flex-1 flex items-center justify-center text-center">
									<h1 className={`text-4xl font-bold leading-tight ${titleFont}`}>
										{coverTitle}
									</h1>
								</div>

								<div className="space-y-2">
									<p className={`text-lg ${authorFont}`}>{authorName}</p>
									<p className="text-sm opacity-80">{formattedDate}</p>
								</div>
							</div>
						);
					}

					const pageData = content[pageNumber] || { title: "", poetry: "" };

					return (
						<div
							key={pageNumber}
							className="bg-white dark:bg-zinc-900 shadow-xl rounded-2xl aspect-[3/4] border border-zinc-200 dark:border-zinc-800 flex flex-col p-6 relative"
						>
							<button
								onClick={() => removePage(pageNumber)}
								className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition text-[1rem] cursor-pointer"
							>
								❌
							</button>

							<input
								type="text"
								placeholder="Título da página"
								value={pageData.title}
								onChange={(e) => handleChange(pageNumber, "title", e.target.value)}
								className="text-xl font-semibold bg-transparent border-b border-zinc-300 dark:border-zinc-700 outline-none mb-4 pb-2 focus:border-purple-600"
							/>

							<textarea
								placeholder="Escreva sua poesia aqui..."
								value={pageData.poetry}
								onChange={(e) => handleChange(pageNumber, "poetry", e.target.value)}
								className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed"
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

export default function EditorPageWrapper() {
	return (
		<Suspense fallback={<div>Carregando editor...</div>}>
			<EditorPage />
		</Suspense>
	);
}