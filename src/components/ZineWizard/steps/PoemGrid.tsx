"use client";

import type { JSX } from "react";
import PoemCard from "@/components/PoemCard";
import type {
	PageField,
	PageImage,
	PoemPage,
	TextBlockKind,
	ZineDoc,
} from "@/domain";
import { positionOf } from "@/domain";

type Props = {
	doc: ZineDoc;
	poems: PoemPage[];
	onChange: (id: string, field: PageField, value: string) => void;
	onAdd: () => void;
	onMove: (id: string, direction: -1 | 1) => void;
	onRemove: (id: string) => void;
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
};

export default function PoemGrid({
	doc,
	poems,
	onChange,
	onAdd,
	onMove,
	onRemove,
	images,
	onImageChange,
	onImageClear,
	onAddBlock,
	onBlockTextChange,
	onBlockRemove,
	onBlockLayerChange,
	onBlockLockToggle,
}: Props): JSX.Element {
	return (
		<div className="space-y-8">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
				<p className="text-zinc-600 dark:text-zinc-400">
					{poems.length === 1 ? "1 poesia no zine." : `${poems.length} poesias no zine.`}
				</p>
				<button
					type="button"
					onClick={onAdd}
					className="bg-[var(--purple-dark)] text-white px-6 py-2 rounded-full font-semibold hover:opacity-90 transition cursor-pointer"
				>
					➕ Adicionar poesia
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
				{poems.map((poem, index) => (
					<PoemCard
						key={poem.id}
						id={poem.id}
						title={poem.title}
						subtitle={poem.subtitle}
						date={poem.date}
						body={poem.body}
						position={positionOf(doc, poem.id)}
						canMoveUp={index > 0}
						canMoveDown={index < poems.length - 1}
						onChange={onChange}
						onMove={onMove}
						onRemove={onRemove}
						image={images[poem.id] ?? null}
						onImageChange={onImageChange}
						onImageClear={onImageClear}
						blocks={poem.blocks ?? []}
						onAddBlock={onAddBlock}
						onBlockTextChange={onBlockTextChange}
						onBlockRemove={onBlockRemove}
						onBlockLayerChange={onBlockLayerChange}
						onBlockLockToggle={onBlockLockToggle}
					/>
				))}
			</div>
		</div>
	);
}
