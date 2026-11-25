"use client";

import type { JSX } from "react";
import IssueList from "@/components/IssueList";
import StepNav from "@/components/StepNav";
import { useZineEditor } from "@/hooks/useZineEditor";
import type { Cover, ZineStep } from "@/domain";
import { STEPS, stepIndex } from "@/domain";
import CoverStep from "./steps/CoverStep";
import PoemsStep from "./steps/PoemsStep";
import PrintStep from "./steps/PrintStep";
import ReviewStep from "./steps/ReviewStep";

type Props = {
	initialStep?: ZineStep;
	/** Campos vindos da URL antiga; so valem quando nao ha rascunho salvo. */
	seedCover?: Cover;
};

export default function ZineWizard({
	initialStep = "cover",
	seedCover,
}: Props): JSX.Element {
	const editor = useZineEditor(seedCover, initialStep);

	const askRemove = (id: string): void => {
		const poem = editor.poems.find((candidate) => candidate.id === id);
		const label = poem?.title.trim() ? `“${poem.title.trim()}”` : "esta poesia";

		if (window.confirm(`Remover ${label}? O texto será perdido.`)) {
			editor.removePoem(id);
		}
	};

	const askReset = (): void => {
		if (window.confirm("Começar um novo zine? O rascunho atual será apagado.")) {
			editor.reset();
		}
	};

	const last = editor.stepNumber >= editor.totalSteps;
	const first = editor.stepNumber <= 1;
	const step = STEPS[stepIndex(editor.step)];

	return (
		<main className="min-h-[calc(100vh-var(--navbar-height))] bg-[var(--background)] text-[var(--foreground)]">
			<section className="max-w-5xl mx-auto px-6 py-6 space-y-5">
				<header className="text-center space-y-1">
					<h1 className="text-3xl font-bold">
						Configure seu{" "}
						<span className="text-[var(--purple-dark)]">Zine</span>
					</h1>
					<p className="text-zinc-600 dark:text-zinc-400">
						Etapa {editor.stepNumber} de {editor.totalSteps} — {step.label}
					</p>
					<p className="text-sm text-zinc-500 dark:text-zinc-500">
						Seu rascunho é salvo neste navegador a cada alteração.
					</p>
				</header>

				<StepNav
					current={editor.step}
					statusOf={editor.statusOf}
					canOpen={editor.canOpen}
					onSelect={editor.goToStep}
				/>

				{!editor.ready ? (
					<p className="text-center text-zinc-500">Carregando rascunho...</p>
				) : (
					<div className="rounded-2xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 md:p-6">
						{editor.step === "cover" ? (
							<CoverStep
								cover={editor.cover}
								issues={editor.issuesOf("cover")}
								onChange={editor.setCoverField}
							/>
						) : null}

						{editor.step === "poems" ? (
							<PoemsStep
								doc={editor.doc}
								poems={editor.poems}
								issues={editor.issuesOf("poems")}
								onChange={editor.changeField}
								onAdd={editor.addPoem}
								onMove={editor.movePoem}
								onRemove={askRemove}
								images={editor.images}
								onImageChange={editor.setPoemImage}
								onImageClear={editor.clearPoemImage}
								onAddBlock={editor.addPoemBlock}
								onBlockTextChange={editor.changePoemBlockText}
								onBlockRemove={editor.removePoemBlock}
								onBlockLayerChange={editor.movePoemBlockLayer}
								onBlockLockToggle={editor.togglePoemBlockLock}
							/>
						) : null}

						{editor.step === "review" ? (
							<ReviewStep
								cover={editor.cover}
								formattedDate={editor.formattedDate}
								doc={editor.doc}
								format={editor.format}
								safetyMargin={editor.safetyMarginPt}
								poems={editor.poems}
								issues={editor.issues}
								diagrammable={editor.diagrammable}
								onChange={editor.changeField}
								onAdd={editor.addPoem}
								onMove={editor.movePoem}
								onRemove={askRemove}
								onGoTo={editor.goToStep}
								images={editor.images}
								onImageChange={editor.setPoemImage}
								onImageClear={editor.clearPoemImage}
								onAddBlock={editor.addPoemBlock}
								onBlockTextChange={editor.changePoemBlockText}
								onBlockRemove={editor.removePoemBlock}
								onBlockLayerChange={editor.movePoemBlockLayer}
								onBlockLockToggle={editor.togglePoemBlockLock}
								onBlocksChange={editor.changePoemBlocks}
						/>
						) : null}

						{editor.step === "print" ? (
							<PrintStep
								format={editor.format}
								printMode={editor.printMode}
								printModeLocked={editor.printModeLocked}
								marks={editor.marks}
								safetyMargin={editor.safetyMargin}
								issues={editor.issues}
								diagrammable={editor.diagrammable}
								onFormatChange={editor.setFormat}
								onPrintModeChange={editor.setPrintMode}
								onMarksChange={editor.setMarks}
								onSafetyMarginChange={editor.setSafetyMargin}
								onDownload={editor.download}
								onGoTo={editor.goToStep}
							/>
						) : null}
					</div>
				)}

				<footer className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<button
						type="button"
						onClick={askReset}
						className="text-sm text-zinc-500 underline hover:text-red-600 transition cursor-pointer"
					>
						Começar um novo zine
					</button>

					<div className="flex items-center gap-3 md:justify-end">
						<button
							type="button"
							onClick={editor.previousStep}
							disabled={first}
							className={`px-6 py-2 rounded-full font-semibold transition ${first
								? "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
								: "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:border-[var(--purple)] cursor-pointer"}`}
						>
							Voltar
						</button>

						<button
							type="button"
							onClick={editor.nextStep}
							disabled={last || !editor.canOpen(STEPS[stepIndex(editor.step) + 1]?.id ?? "print")}
							className={`px-8 py-2 rounded-full font-semibold transition ${last ||
								!editor.canOpen(STEPS[stepIndex(editor.step) + 1]?.id ?? "print")
								? "bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500"
								: "bg-[var(--purple-dark)] text-white hover:opacity-90 cursor-pointer"}`}
						>
							Continuar
						</button>
					</div>
				</footer>

				{editor.step !== "review" && editor.step !== "print" ? (
					<section className="space-y-1">
						<h2 className="text-sm font-semibold">Resumo das pendências</h2>
						<IssueList
							issues={editor.issues}
							emptyMessage="Nenhuma pendência no zine."
						/>
					</section>
				) : null}
			</section>
		</main>
	);
}
