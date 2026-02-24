"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type PageContent = {
	title: string;
	poetry: string;
};

export default function EditorPage() {
	const searchParams = useSearchParams();

	const pages = Number(searchParams.get("pages")) || 0;
	const coverTitle = searchParams.get("coverTitle") || "";
	const authorName = searchParams.get("authorName") || "";
	const titleFont = searchParams.get("titleFont") || "font-sans";
	const authorFont = searchParams.get("authorFont") || "font-sans";
	const date = searchParams.get("date");

	const formattedDate = useMemo(() => {
		if (!date) return "";
		return new Date(date).toLocaleDateString("pt-BR");
	}, [date]);

	const pageArray = Array.from({ length: pages }, (_, i) => i + 1);

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

	return (
		<main className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 p-10">

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

				{pageArray.map((pageNumber) => {

					// CAPA
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

					// PÁGINAS INTERNAS
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
								overflow-hidden
							"
						>
							{/* TÍTULO */}
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

							{/* POESIA */}
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
									placeholder:text-zinc-400
								"
							/>

							{/* NÚMERO DA PÁGINA */}
							<div className="text-center text-xs text-zinc-400 mt-4">
								{pageNumber}
							</div>
						</div>
					);
				})}

			</div>

		</main>
	);
}