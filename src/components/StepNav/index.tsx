import type { JSX } from "react";
import type { StepStatus, ZineStep } from "@/domain";
import { STEPS } from "@/domain";

type Props = {
	current: ZineStep;
	statusOf: (step: ZineStep) => StepStatus;
	canOpen: (step: ZineStep) => boolean;
	onSelect: (step: ZineStep) => void;
};

const BADGE: Record<StepStatus, string> = {
	done: "✓",
	pending: "!",
	blocked: "·",
};

const BADGE_CLASS: Record<StepStatus, string> = {
	done: "bg-green-600 text-white",
	pending: "bg-amber-500 text-white",
	blocked: "bg-zinc-300 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
};

export default function StepNav({
	current,
	statusOf,
	canOpen,
	onSelect,
}: Props): JSX.Element {
	return (
		<nav aria-label="Etapas do cadastro">
			<ol className="flex flex-wrap gap-2">
				{STEPS.map((step, index) => {
					const active = step.id === current;
					const open = canOpen(step.id);
					const status = statusOf(step.id);

					return (
						<li key={step.id} className="flex-1 min-w-[10rem]">
							<button
								type="button"
								onClick={() => onSelect(step.id)}
								disabled={!open}
								aria-current={active ? "step" : undefined}
								title={open ? step.description : "Conclua o conteúdo mínimo para liberar"}
								className={`
									w-full text-left rounded-2xl border-2 px-4 py-3 transition
									${active
										? "border-[var(--purple-dark)] bg-white dark:bg-zinc-900"
										: "border-transparent bg-white/60 dark:bg-zinc-900/60"}
									${open
										? "cursor-pointer hover:border-[var(--purple)]"
										: "opacity-50 cursor-not-allowed"}
								`}
							>
								<span className="flex items-center justify-between gap-2">
									<span className="text-xs uppercase tracking-wide text-zinc-500">
										Etapa {index + 1}
									</span>
									<span
										aria-label={`Situação: ${status}`}
										className={`h-5 w-5 rounded-full text-[11px] flex items-center justify-center ${BADGE_CLASS[status]}`}
									>
										{BADGE[status]}
									</span>
								</span>
								<span className="block font-semibold text-sm mt-1">
									{step.label}
								</span>
							</button>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
