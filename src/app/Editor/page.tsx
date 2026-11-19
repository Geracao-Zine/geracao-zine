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
			<FormatSelector value={editor.format} onChange={editor.setFormat} />

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
