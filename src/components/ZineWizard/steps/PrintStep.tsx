"use client";

import type { JSX } from "react";
import { FormatSelector } from "@/components/FormatSelector";
import IssueList from "@/components/IssueList";
import PrintModeSelector from "@/components/PrintModeSelector";
import type { DraftIssue, PrintMode, ZineFormat, ZineStep } from "@/domain";
import { SAFETY_MARGIN_OPTIONS } from "@/domain";

type Props = {
	format: ZineFormat;
	printMode: PrintMode;
	/** Verdadeiro quando a dobra obriga simplex ou duplex. */
	printModeLocked: boolean;
	marks: boolean;
	/** Margem de seguranca em milimetros. */
	safetyMargin: number;
	issues: DraftIssue[];
	diagrammable: boolean;
	onFormatChange: (format: ZineFormat) => void;
	onPrintModeChange: (mode: PrintMode) => void;
	onMarksChange: (marks: boolean) => void;
	onSafetyMarginChange: (mm: number) => void;
	onDownload: () => Promise<void>;
	onGoTo: (step: ZineStep) => void;
};

export default function PrintStep({
	format,
	printMode,
	printModeLocked,
	marks,
	safetyMargin,
	issues,
	diagrammable,
	onFormatChange,
	onPrintModeChange,
	onMarksChange,
	onSafetyMarginChange,
	onDownload,
	onGoTo,
}: Props): JSX.Element {
	return (
		<div className="space-y-8">
			{!diagrammable ? (
				<section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-6 py-4">
					<h2 className="font-semibold text-amber-900 dark:text-amber-200">
						Conteúdo mínimo pendente
					</h2>
					<p className="text-sm text-amber-900 dark:text-amber-200">
						A dobra só é liberada com capa completa e ao menos uma poesia com
						texto.
					</p>
					<button
						type="button"
						onClick={() => onGoTo("cover")}
						className="text-sm font-semibold underline cursor-pointer"
					>
						Voltar para a capa
					</button>
				</section>
			) : null}

			<section className="space-y-2" aria-live="polite">
				<h2 className="font-semibold">Pendências</h2>
				<IssueList issues={issues} emptyMessage="Nenhuma pendência." />
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold">Escolha a dobra</h2>
				<FormatSelector value={format} onChange={onFormatChange} />
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold">Como vai imprimir</h2>
				<PrintModeSelector
					value={printMode}
					locked={printModeLocked}
					onChange={onPrintModeChange}
				/>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold">Marcas e margem de segurança</h2>

				<label className="flex items-start gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 cursor-pointer">
					<input
						type="checkbox"
						checked={marks}
						onChange={(event) => onMarksChange(event.target.checked)}
						className="mt-1 h-4 w-4 accent-[var(--purple-dark)] cursor-pointer"
					/>
					<span>
						<span className="block text-sm font-semibold">
							Marcas de corte e dobra
						</span>
						<span className="block text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
							Tracejado para dobrar e linha contínua para cortar, sempre fora dos
							painéis.
						</span>
					</span>
				</label>

				<label className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
					<span>
						<span className="block text-sm font-semibold">
							Margem de segurança
						</span>
						<span className="block text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
							Afasta o texto das dobras e dos cortes. O preview usa a mesma
							margem.
						</span>
					</span>
					<select
						value={safetyMargin}
						onChange={(event) => onSafetyMarginChange(Number(event.target.value))}
						className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm cursor-pointer"
					>
						{SAFETY_MARGIN_OPTIONS.map((mm) => (
							<option key={mm} value={mm}>
								{mm === 0 ? "Sem margem" : `${mm} mm`}
							</option>
						))}
					</select>
				</label>
			</section>

			<div className="text-center">
				<button
					type="button"
					onClick={onDownload}
					disabled={!diagrammable}
					className={`px-10 py-3 rounded-full font-semibold transition ${diagrammable
						? "bg-green-600 text-white hover:opacity-90 cursor-pointer"
						: "bg-zinc-300 text-zinc-500 cursor-not-allowed"}`}
				>
					Baixar Zine (PDF)
				</button>
			</div>
		</div>
	);
}
