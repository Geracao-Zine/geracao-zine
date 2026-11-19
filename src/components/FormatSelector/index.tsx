"use client";

import type { ZineFormat } from "@/domain";
import { FORMAT_OPTIONS } from "@/domain";

export type { ZineFormat };

function FormatDiagram({ format }: { format: ZineFormat }) {
	if (format === "mini-zine") {
		return (
			<svg viewBox="0 0 120 80" className="w-full h-20">
				<rect x="10" y="10" width="100" height="60" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
				<line x1="60" y1="10" x2="60" y2="70" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
				<line x1="10" y1="40" x2="110" y2="40" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" />
				<line x1="35" y1="40" x2="85" y2="40" stroke="currentColor" strokeWidth="2" />
			</svg>
		);
	}

	if (format === "saddle-stitch") {
		return (
			<svg viewBox="0 0 120 80" className="w-full h-20">
				<rect x="20" y="8" width="80" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
				<rect x="15" y="12" width="80" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
				<rect x="10" y="16" width="80" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
				<line x1="50" y1="10" x2="50" y2="86" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
				<rect x="47" y="20" width="6" height="3" fill="currentColor" />
				<rect x="47" y="72" width="6" height="3" fill="currentColor" />
			</svg>
		);
	}

	// reading
	return (
		<svg viewBox="0 0 120 80" className="w-full h-20">
			<rect x="15" y="10" width="35" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
			<rect x="55" y="10" width="35" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
			<rect x="95" y="10" width="10" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
		</svg>
	);
}

export function FormatSelector({
	value,
	onChange,
}: {
	value: ZineFormat;
	onChange: (format: ZineFormat) => void;
}) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
			{FORMAT_OPTIONS.map((opt) => {
				const selected = value === opt.id;
				return (
					<button
						key={opt.id}
						disabled={!opt.available}
						onClick={() => opt.available && onChange(opt.id)}
						className={`
							text-left p-4 rounded-2xl border-2 transition relative
							${!opt.available ? "opacity-50 cursor-not-allowed" : ""}
							${selected
								? "border-purple-600 bg-purple-50 dark:bg-purple-950/30"
								: "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}
						`}
					>
						<div className="text-zinc-500 dark:text-zinc-400 mb-2">
							<FormatDiagram format={opt.id} />
						</div>
						<div className="flex items-center justify-between mb-1">
							<span className="font-semibold text-sm">{opt.label}</span>
							<span className={`
								text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full
								${opt.available
									? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
									: "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"}
							`}>
								{opt.badge}
							</span>
						</div>
						<p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
							{opt.description}
						</p>
					</button>
				);
			})}
		</div>
	);
}