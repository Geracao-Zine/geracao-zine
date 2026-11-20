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
	rounded-lg
	px-3 py-1.5
	focus:outline-none
	focus:ring-2
	focus:ring-[var(--purple-dark)]
	transition
`;

const REQUIRED_MARK = (
	<span className="text-red-600 dark:text-red-400" aria-hidden="true">
		{" "}*
	</span>
);

export default function CoverStep({ cover, issues, onChange }: Props): JSX.Element {
	const fontes = FONTS.map((font) => ({
		id: font.id,
		label: font.label,
		className: font.className,
	}));

	return (
		<div className="space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<label className="text-sm font-semibold" htmlFor="cover-title">
						Título da capa{REQUIRED_MARK}
					</label>
					<input
						id="cover-title"
						type="text"
						required
						aria-required="true"
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

				<div className="space-y-1.5">
					<label className="text-sm font-semibold" htmlFor="cover-author">
						Nome do autor(a){REQUIRED_MARK}
					</label>
					<input
						id="cover-author"
						type="text"
						required
						aria-required="true"
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
			</div>

			<div className="space-y-1">
				<label className="text-sm font-semibold" htmlFor="cover-date">
					Data da capa{" "}
					<span className="font-normal text-zinc-500">(opcional)</span>
				</label>
				<input
					id="cover-date"
					type="date"
					className={`${INPUT_CLASS} sm:max-w-[14rem]`}
					value={cover.date}
					onChange={(e) => onChange("date", e.target.value)}
				/>
				<p className="text-xs text-zinc-500">
					Deixe em branco para publicar sem data na capa.
				</p>
			</div>

			<section className="space-y-1" aria-live="polite">
				<h2 className="text-sm font-semibold">Pendências desta etapa</h2>
				<IssueList issues={issues} emptyMessage="Capa pronta." />
			</section>
		</div>
	);
}
