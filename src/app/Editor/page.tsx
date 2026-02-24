"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

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

	return (
		<main className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 p-10">

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

				{pageArray.map((pageNumber) => {

					// 🟣 CAPA (Página 1)
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

					// ⚪ OUTRAS PÁGINAS
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
								overflow-hidden
							"
						>
							<div className="p-4 border-b border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500">
								Página {pageNumber}
							</div>

							<div
								contentEditable
								suppressContentEditableWarning
								className="
									flex-1
									p-6
									outline-none
									focus:bg-zinc-50 dark:focus:bg-zinc-800
									transition
								"
							>
								<p className="text-zinc-400">
									Clique aqui para editar...
								</p>
							</div>

							<div className="p-3 text-center text-xs text-zinc-400 border-t border-zinc-200 dark:border-zinc-800">
								{pageNumber}
							</div>
						</div>
					);
				})}

			</div>

		</main>
	);
}