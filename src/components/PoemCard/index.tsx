import type { JSX } from "react";
import type { PoemField } from "@/domain";

type Props = {
	id: string;
	title: string;
	poetry: string;
	position: number;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onChange: (id: string, field: PoemField, value: string) => void;
	onMove: (id: string, direction: -1 | 1) => void;
	onRemove: (id: string) => void;
};

export default function PoemCard({
	id,
	title,
	poetry,
	position,
	canMoveUp,
	canMoveDown,
	onChange,
	onMove,
	onRemove,
}: Props): JSX.Element {
	return (
		<article className="bg-white dark:bg-zinc-900 shadow-xl rounded-2xl aspect-[3/4] border border-zinc-200 dark:border-zinc-800 flex flex-col p-6 relative">
			<div className="absolute top-3 right-3 flex items-center gap-1">
				<button
					type="button"
					onClick={() => onMove(id, -1)}
					disabled={!canMoveUp}
					aria-label={`Mover a poesia ${position} para cima`}
					className="text-zinc-400 hover:text-purple-600 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
				>
					↑
				</button>
				<button
					type="button"
					onClick={() => onMove(id, 1)}
					disabled={!canMoveDown}
					aria-label={`Mover a poesia ${position} para baixo`}
					className="text-zinc-400 hover:text-purple-600 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
				>
					↓
				</button>
				<button
					type="button"
					onClick={() => onRemove(id)}
					aria-label={`Remover a poesia ${position}`}
					className="text-zinc-400 hover:text-red-500 transition cursor-pointer"
				>
					❌
				</button>
			</div>

			<label className="sr-only" htmlFor={`poem-title-${id}`}>
				Título da poesia {position}
			</label>
			<input
				id={`poem-title-${id}`}
				type="text"
				placeholder="Título da página"
				value={title}
				onChange={(e) => onChange(id, "title", e.target.value)}
				className="text-xl font-semibold bg-transparent border-b border-zinc-300 dark:border-zinc-700 outline-none mb-4 pb-2 pr-16 focus:border-purple-600"
			/>

			<label className="sr-only" htmlFor={`poem-text-${id}`}>
				Texto da poesia {position}
			</label>
			<textarea
				id={`poem-text-${id}`}
				placeholder="Escreva sua poesia aqui..."
				value={poetry}
				onChange={(e) => onChange(id, "poetry", e.target.value)}
				className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed"
			/>

			<div className="text-center text-xs text-zinc-400 mt-4">{position}</div>
		</article>
	);
}
