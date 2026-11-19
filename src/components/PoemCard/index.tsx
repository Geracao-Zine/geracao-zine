import type { JSX } from "react";
import type { PoemField } from "@/domain";

type Props = {
	id: string;
	title: string;
	poetry: string;
	position: number;
	onChange: (id: string, field: PoemField, value: string) => void;
	onRemove: (id: string) => void;
};

export default function PoemCard({
	id,
	title,
	poetry,
	position,
	onChange,
	onRemove,
}: Props): JSX.Element {
	return (
		<div className="bg-white dark:bg-zinc-900 shadow-xl rounded-2xl aspect-[3/4] border border-zinc-200 dark:border-zinc-800 flex flex-col p-6 relative">
			<button
				onClick={() => onRemove(id)}
				className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 transition text-[1rem] cursor-pointer"
			>
				❌
			</button>

			<input
				type="text"
				placeholder="Título da página"
				value={title}
				onChange={(e) => onChange(id, "title", e.target.value)}
				className="text-xl font-semibold bg-transparent border-b border-zinc-300 dark:border-zinc-700 outline-none mb-4 pb-2 focus:border-purple-600"
			/>

			<textarea
				placeholder="Escreva sua poesia aqui..."
				value={poetry}
				onChange={(e) => onChange(id, "poetry", e.target.value)}
				className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed"
			/>

			<div className="text-center text-xs text-zinc-400 mt-4">{position}</div>
		</div>
	);
}
