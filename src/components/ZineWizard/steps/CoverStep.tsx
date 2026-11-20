"use client";

import type { JSX } from "react";
import FontSelector from "@/components/FontSelector";
import IssueList from "@/components/IssueList";
import type { Cover, DraftIssue } from "@/domain";
import type { FontId } from "@/lib/fonts";
import { FONTS } from "@/lib/fonts";

type Props = {
	cover: Cover;
	issues: DraftIssue[];
	onChange: (field: keyof Cover, value: string) => void;
};

const INPUT_CLASS = `
	w-full
	bg-white dark:bg-zinc-900
	text-zinc-900 dark:text-zinc-100
	border border-zinc-300 dark:border-zinc-700
	rounded-xl
	px-4 py-3
	focus:outline-none
	focus:ring-2
	focus:ring-[var(--purple-dark)]
	transition
`;

export default function CoverStep({ cover, issues, onChange }: Props): JSX.Element {
	const fontes = FONTS.map((font) => ({
		id: font.id,
		label: font.label,
		className: font.className,
	}));

	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<label className="font-semibold" htmlFor="cover-title">
					Título da capa
				</label>
				<input
					id="cover-title"
					type="text"
					className={INPUT_CLASS}
					placeholder="Digite o título"
					value={cover.title}
					onChange={(e) => onChange("title", e.target.value)}
				/>

				<FontSelector
					label="Fonte do título"
					value={cover.titleFont}
					onChange={(id: FontId) => onChange("titleFont", id)}
					options={fontes}
				/>
			</div>

			<div className="space-y-2">
				<label className="font-semibold" htmlFor="cover-author">
					Nome do autor(a)
				</label>
				<input
					id="cover-author"
					type="text"
					className={INPUT_CLASS}
					placeholder="Digite o nome"
					value={cover.author}
					onChange={(e) => onChange("author", e.target.value)}
				/>

				<FontSelector
					label="Fonte do autor"
					value={cover.authorFont}
					onChange={(id: FontId) => onChange("authorFont", id)}
					options={fontes}
				/>
			</div>

			<div className="space-y-2">
				<label className="font-semibold" htmlFor="cover-date">
					Data da capa{" "}
					<span className="font-normal text-zinc-500">(opcional)</span>
				</label>
				<input
					id="cover-date"
					type="date"
					className={INPUT_CLASS}
					value={cover.date}
					onChange={(e) => onChange("date", e.target.value)}
				/>
				<p className="text-sm text-zinc-500">
					Deixe em branco para publicar sem data na capa.
				</p>
			</div>

			<section className="space-y-2" aria-live="polite">
				<h2 className="font-semibold">Pendências desta etapa</h2>
				<IssueList issues={issues} emptyMessage="Capa pronta." />
			</section>
		</div>
	);
}
