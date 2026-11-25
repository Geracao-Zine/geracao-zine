import type { JSX } from "react";
import type {
        PageField,
        PageImage,
        TextBlock,
        TextBlockKind,
} from "@/domain";
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
	blocks: TextBlock[];
	onAddBlock: (id: string, kind: TextBlockKind) => void;
	onBlockTextChange: (id: string, blockId: string, text: string) => void;
	onBlockRemove: (id: string, blockId: string) => void;
	onBlockLayerChange: (
		id: string,
		blockId: string,
		direction: "front" | "back"
	) => void;
	onBlockLockToggle: (id: string, blockId: string) => void;
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
	blocks,
	onAddBlock,
	onBlockTextChange,
	onBlockRemove,
	onBlockLayerChange,
	onBlockLockToggle,
}: Props): JSX.Element {
	const thumbnail = useImageUrl(image?.assetId ?? null);

	return (
		<article className="bg-white dark:bg-zinc-900 shadow-xl rounded-2xl min-h-[28rem] border border-zinc-200 dark:border-zinc-800 flex flex-col p-6 relative">
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
				className={`min-h-24 flex-1 resize-none text-sm leading-relaxed ${FIELD_CLASS}`}
			/>

			{blocks.length === 0 &&
			!title.trim() &&
			!subtitle.trim() &&
			!date &&
			!body.trim() ? (
				<p className="mt-3 rounded-xl border border-dashed border-zinc-300 p-3 text-xs text-zinc-500 dark:border-zinc-700">
					Página em branco. Adicione um bloco de título ou de texto para começar.
				</p>
			) : null}

			<details className="mt-3 text-xs">
				<summary className="cursor-pointer font-semibold text-zinc-500 hover:text-purple-600">
					Blocos posicionados ({blocks.length})
				</summary>

				<div className="mt-2 flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => onAddBlock(id, "title")}
						className="rounded-full border border-zinc-300 px-3 py-1 font-semibold hover:border-[var(--purple)] cursor-pointer dark:border-zinc-700"
					>
						+ Título
					</button>
					<button
						type="button"
						onClick={() => onAddBlock(id, "text")}
						className="rounded-full border border-zinc-300 px-3 py-1 font-semibold hover:border-[var(--purple)] cursor-pointer dark:border-zinc-700"
					>
						+ Texto
					</button>
				</div>

				{blocks.length > 0 ? (
					<>
						<p className="mt-2 text-zinc-500">
							Esta página usa os blocos abaixo; os campos de texto acima são ignorados.
						</p>
						<div className="mt-2 max-h-56 space-y-2 overflow-auto pr-1">
							{blocks.map((block) => (
								<div
									key={block.id}
									className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<span className="font-semibold text-zinc-500">
											{block.kind === "title" ? "Título" : "Texto"}
											{block.locked ? " · travado" : ""}
										</span>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => onBlockLayerChange(id, block.id, "back")}
												aria-label="Enviar bloco para trás"
												className="text-zinc-400 hover:text-purple-600 cursor-pointer"
											>
												Trás
											</button>
											<button
												type="button"
												onClick={() => onBlockLayerChange(id, block.id, "front")}
												aria-label="Trazer bloco para frente"
												className="text-zinc-400 hover:text-purple-600 cursor-pointer"
											>
												Frente
											</button>
											<button
												type="button"
												onClick={() => onBlockLockToggle(id, block.id)}
												aria-pressed={block.locked}
												className="text-zinc-400 hover:text-purple-600 cursor-pointer"
											>
												{block.locked ? "Destravar" : "Travar"}
											</button>
											<button
												type="button"
												onClick={() => onBlockRemove(id, block.id)}
												aria-label={`Remover bloco de ${block.kind === "title" ? "título" : "texto"}`}
												className="text-zinc-400 hover:text-red-500 cursor-pointer"
											>
												Remover
											</button>
										</div>
									</div>
									<label className="sr-only" htmlFor={`block-${id}-${block.id}`}>
										Conteúdo do bloco
									</label>
									<textarea
										id={`block-${id}-${block.id}`}
										rows={2}
										value={block.text}
										onChange={(e) =>
											onBlockTextChange(id, block.id, e.target.value)
										}
										placeholder="Escreva aqui..."
										className={`mt-1 resize-none text-sm leading-relaxed ${FIELD_CLASS}`}
									/>
								</div>
							))}
						</div>
					</>
				) : null}
			</details>

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
