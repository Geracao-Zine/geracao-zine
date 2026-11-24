import type { JSX } from "react";
import type { PageField, PageImage } from "@/domain";
import { useImageUrl } from "@/hooks/useImageUrl";

type Props = {
	id: string;
	title: string;
	subtitle: string;
	date: string;
	body: string;
	position: number;
	canMoveUp: boolean;
	canMoveDown: boolean;
	onChange: (id: string, field: PageField, value: string) => void;
	/** Imagem do painel, ou null quando a pagina e so texto. */
	image: PageImage | null;
	onImageChange: (id: string, file: File) => void;
	onImageClear: (id: string) => void;
	onMove: (id: string, direction: -1 | 1) => void;
	onRemove: (id: string) => void;
};

const FIELD_CLASS = "bg-transparent outline-none w-full focus:border-purple-600";

export default function PoemCard({
	id,
	title,
	subtitle,
	date,
	body,
	position,
	canMoveUp,
	canMoveDown,
	onChange,
	onMove,
	onRemove,
	image,
	onImageChange,
	onImageClear,
}: Props): JSX.Element {
	const thumbnail = useImageUrl(image?.assetId ?? null);

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
				Título da página {position}
			</label>
			<input
				id={`poem-title-${id}`}
				type="text"
				placeholder="Título (opcional)"
				value={title}
				onChange={(e) => onChange(id, "title", e.target.value)}
				className={`text-xl font-semibold border-b border-zinc-300 dark:border-zinc-700 mb-2 pb-2 pr-16 ${FIELD_CLASS}`}
			/>

			<label className="sr-only" htmlFor={`poem-subtitle-${id}`}>
				Subtítulo da página {position}
			</label>
			<input
				id={`poem-subtitle-${id}`}
				type="text"
				placeholder="Subtítulo (opcional)"
				value={subtitle}
				onChange={(e) => onChange(id, "subtitle", e.target.value)}
				className={`text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2 ${FIELD_CLASS}`}
			/>

			<label className="sr-only" htmlFor={`poem-date-${id}`}>
				Data da página {position}
			</label>
			<input
				id={`poem-date-${id}`}
				type="date"
				value={date}
				onChange={(e) => onChange(id, "date", e.target.value)}
				className={`text-xs text-zinc-500 mb-4 ${FIELD_CLASS}`}
			/>

			<label className="sr-only" htmlFor={`poem-text-${id}`}>
				Texto da página {position}
			</label>
			<textarea
				id={`poem-text-${id}`}
				placeholder="Escreva sua poesia aqui..."
				value={body}
				onChange={(e) => onChange(id, "body", e.target.value)}
				className={`flex-1 resize-none text-sm leading-relaxed ${FIELD_CLASS}`}
			/>

			<div className="flex items-center gap-2 mt-3">
			<label
				htmlFor={`poem-image-${id}`}
				className="text-xs text-zinc-500 hover:text-purple-600 transition cursor-pointer"
			>
				{image ? "Trocar imagem" : "Adicionar imagem"}
			</label>
			<input
				id={`poem-image-${id}`}
				type="file"
				accept="image/png,image/jpeg"
				className="sr-only"
				onChange={(e) => {
					const file = e.target.files?.[0];

					if (file) {
						onImageChange(id, file);
					}

					// Limpa a selecao para o mesmo arquivo poder ser escolhido de novo.
					e.target.value = "";
				}}
			/>

			{/* Miniatura decorativa: os bytes sao um blob local e o `next/image`
			    nao teria o que otimizar, so um carregador a mais. */}
			{image && thumbnail ? (
				<>
				<div
					aria-hidden="true"
					className="h-8 w-8 rounded border border-zinc-200 dark:border-zinc-700 bg-cover bg-center"
					style={{ backgroundImage: `url(${thumbnail})` }}
				/>
				<button
					type="button"
					onClick={() => onImageClear(id)}
					aria-label={`Remover a imagem da página ${position}`}
					className="text-xs text-zinc-400 hover:text-red-500 transition cursor-pointer"
				>
					Remover imagem
				</button>
				</>
			) : null}
		</div>

		<div className="text-center text-xs text-zinc-400 mt-4">{position}</div>
		</article>
	);
}
