"use client";

import type { JSX } from "react";
import IssueList from "@/components/IssueList";
import type {
	DraftIssue,
	PageField,
	PageImage,
	PoemPage,
	TextBlockKind,
	ZineDoc,
} from "@/domain";
import PoemGrid from "./PoemGrid";

type Props = {
	doc: ZineDoc;
	poems: PoemPage[];
	issues: DraftIssue[];
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

export default function PoemsStep({
	doc,
	poems,
	issues,
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
			<section className="space-y-2" aria-live="polite">
				<h2 className="font-semibold">Pendências</h2>
				<IssueList issues={issues} emptyMessage="Todas as poesias estão prontas." />
			</section>

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
		</div>
	);
}
