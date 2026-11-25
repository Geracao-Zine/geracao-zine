"use client";

import type { JSX } from "react";
import CoverCard from "@/components/CoverCard";
import IssueList from "@/components/IssueList";
import PoemPreview from "@/components/PoemPreview";
import PoemGrid from "./PoemGrid";
import type {
	Cover,
	DraftIssue,
	PageField,
	PageImage,
	PoemPage,
	TextBlock,
	TextBlockKind,
	ZineDoc,
	ZineFormat,
	ZineStep,
} from "@/domain";
import { formatIsoDate } from "@/domain";

type Props = {
	cover: Cover;
	formattedDate: string;
	doc: ZineDoc;
	format: ZineFormat;
	/** Margem de seguranca do PDF, em pontos. */
	safetyMargin: number;
	poems: PoemPage[];
	issues: DraftIssue[];
	diagrammable: boolean;
	onChange: (id: string, field: PageField, value: string) => void;
	onAdd: () => void;
	onMove: (id: string, direction: -1 | 1) => void;
	onRemove: (id: string) => void;
	onGoTo: (step: ZineStep) => void;
	images: Record<string, PageImage>;
	onImageChange: (id: string, file: File) => void;
	onImageClear: (id: string) => void;
	onAddBlock: (id: string, kind: TextBlockKind) => void;
	onBlockTextChange: (id: string, blockId: string, text: string) => void;
	onBlockRemove: (id: string, blockId: string) => void;
	onBlockLayerChange: (
		id: string,
		blockId: string,
		direction: "front" | "back"
	) => void;
	onBlockLockToggle: (id: string, blockId: string) => void;
	onBlocksChange: (id: string, blocks: TextBlock[]) => void;
};

export default function ReviewStep({
	cover,
	formattedDate,
	doc,
	format,
	safetyMargin,
	poems,
	issues,
	diagrammable,
	onChange,
	onAdd,
	onMove,
	onRemove,
	onGoTo,
	images,
	onImageChange,
	onImageClear,
	onAddBlock,
	onBlockTextChange,
	onBlockRemove,
	onBlockLayerChange,
	onBlockLockToggle,
	onBlocksChange,
}: Props): JSX.Element {
	return (
		<div className="space-y-10">
			<section className="grid grid-cols-1 lg:grid-cols-[minmax(0,20rem)_1fr] gap-8 items-start">
				<div>
					<h2 className="font-semibold mb-3">Capa</h2>
					<div className="max-w-xs">
						<CoverCard cover={cover} formattedDate={formattedDate} />
					</div>
					<button
						type="button"
						onClick={() => onGoTo("cover")}
						className="mt-4 text-sm font-semibold text-[var(--purple-dark)] underline cursor-pointer"
					>
						Editar capa e autoria
					</button>
				</div>

				<div className="space-y-4">
					<h2 className="font-semibold">Pendências antes de diagramar</h2>
					<IssueList
						issues={issues}
						emptyMessage="Nenhuma pendência: o zine pode ser diagramado."
					/>
					<p
						className={`text-sm ${diagrammable
							? "text-green-700 dark:text-green-400"
							: "text-zinc-600 dark:text-zinc-400"}`}
					>
						{diagrammable
							? "Conteúdo mínimo atingido: a etapa de dobra está liberada."
							: "Para liberar a etapa de dobra, preencha o título, a autoria e ao menos uma poesia com texto."}
					</p>
				</div>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold">Conteúdo das poesias</h2>
				<PoemGrid
					doc={doc}
					poems={poems}
					onChange={onChange}
					onAdd={onAdd}
					onMove={onMove}
					onRemove={onRemove}
					images={images}
					onImageChange={onImageChange}
					onImageClear={onImageClear}
					onAddBlock={onAddBlock}
					onBlockTextChange={onBlockTextChange}
					onBlockRemove={onBlockRemove}
					onBlockLayerChange={onBlockLayerChange}
					onBlockLockToggle={onBlockLockToggle}
				/>
			</section>

			<section className="space-y-4">
				<h2 className="font-semibold">Pré-visualização</h2>
				<p className="text-sm text-zinc-600 dark:text-zinc-400">
					Mesmo motor de medição do PDF: o corpo da fonte é o maior que cabe na caixa e o
					texto que não couber segue em continuação identificada.
				</p>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{poems.map((poem) => (
						<PoemPreview
							key={poem.id}
							title={poem.title}
							subtitle={poem.subtitle}
							date={formatIsoDate(poem.date)}
							body={poem.body}
							blocks={poem.blocks}
							font={cover.titleFont}
							format={format}
							safetyMargin={safetyMargin}
							image={images[poem.id] ?? null}
							onBlocksChange={(next) => onBlocksChange(poem.id, next)}
							editable
						/>
					))}
				</div>
			</section>
		</div>
	);
}
