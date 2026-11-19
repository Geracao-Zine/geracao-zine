import type { JSX } from "react";
import type { Cover } from "@/domain";
import { authorClassOf, titleClassOf } from "@/domain";

type Props = {
	cover: Cover;
	formattedDate: string;
};

export default function CoverCard({ cover, formattedDate }: Props): JSX.Element {
	return (
		<div className="bg-gradient-to-br from-purple-600 to-purple-900 text-white shadow-2xl rounded-2xl aspect-[3/4] flex flex-col justify-between p-8">
			<div className="flex-1 flex items-center justify-center text-center">
				<h1 className={`text-4xl font-bold leading-tight ${titleClassOf(cover)}`}>
					{cover.title}
				</h1>
			</div>

			<div className="space-y-2">
				<p className={`text-lg ${authorClassOf(cover)}`}>{cover.author}</p>
				{formattedDate ? (
					<p className="text-sm opacity-80">{formattedDate}</p>
				) : null}
			</div>
		</div>
	);
}
