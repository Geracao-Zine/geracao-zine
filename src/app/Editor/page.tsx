"use client";

import { useSearchParams } from "next/navigation";
import type { JSX } from "react";
import { Suspense, useMemo } from "react";
import CoverCard from "@/components/CoverCard";
import { FormatSelector } from "@/components/FormatSelector";
import PoemCard from "@/components/PoemCard";
import { coverFromParams, positionOf } from "@/domain";
import { useZineEditor } from "@/hooks/useZineEditor";

function EditorPage(): JSX.Element {
	const searchParams = useSearchParams();
	const cover = useMemo(() => coverFromParams(searchParams), [searchParams]);

	const editor = useZineEditor(cover);

	return (
		<main className="min-h-screen bg-zinc-100 dark:bg-black text-zinc-900 dark:text-zinc-100 p-10">
			<div className="mb-8 flex flex-col md:flex-row md:items-end gap-4">
				<FormatSelector value={editor.format} onChange={editor.setFormat} />

				<div className="flex flex-col gap-1">
					<label htmlFor="cover-date" className="text-sm font-semibold">
						Data da capa <span className="font-normal text-zinc-500">(opcional)</span>
					</label>
					<input
						id="cover-date"
						type="date"
						value={editor.date}
						onChange={(e) => editor.setDate(e.target.value)}
						className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{editor.doc.pages.map((page) => {
					if (page.kind === "cover") {
						return (
							<CoverCard
								key={page.id}
								cover={cover}
								formattedDate={editor.formattedDate}
							/>
						);
					}

					return (
						<PoemCard
							key={page.id}
							id={page.id}
							title={page.title}
							poetry={page.poetry}
							position={positionOf(editor.doc, page.id)}
							onChange={editor.changeField}
							onRemove={editor.removePoem}
						/>
					);
				})}

				<nav className="mb-8 flex flex-col md:flex-row gap-2 justify-between lg:col-span-3">
					<button
						onClick={editor.addPoem}
						className="bg-purple-600 text-white px-6 py-2 rounded-full hover:opacity-90 transition"
					>
						➕ Adicionar Página
					</button>
					<button
						onClick={editor.download}
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
