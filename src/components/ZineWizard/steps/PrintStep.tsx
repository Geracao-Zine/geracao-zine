"use client";

import type { JSX } from "react";
import { FormatSelector } from "@/components/FormatSelector";
import IssueList from "@/components/IssueList";
import PrintModeSelector from "@/components/PrintModeSelector";
import type { DraftIssue, PrintMode, ZineFormat, ZineStep } from "@/domain";

type Props = {
	format: ZineFormat;
	printMode: PrintMode;
	issues: DraftIssue[];
	diagrammable: boolean;
	onFormatChange: (format: ZineFormat) => void;
	onPrintModeChange: (mode: PrintMode) => void;
	onDownload: () => Promise<void>;
	onGoTo: (step: ZineStep) => void;
};

export default function PrintStep({
	format,
	printMode,
	issues,
	diagrammable,
	onFormatChange,
	onPrintModeChange,
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
				<PrintModeSelector value={printMode} onChange={onPrintModeChange} />
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
