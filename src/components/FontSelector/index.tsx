"use client";

type FontOption<T extends string> = {
	id: T;
	label: string;
	className: string;
};

type Props<T extends string> = {
	value: T;
	onChange: (id: T) => void;
	options: FontOption<T>[];
	label?: string;
};

export default function FontSelector<T extends string>({
	value,
	onChange,
	options,
	label,
}: Props<T>) {
	return (
		<div className="space-y-1.5">
			{label && <p className="text-sm font-semibold">{label}</p>}

			<div className="flex flex-wrap gap-2">
				{options.map((font) => {
					const selected = value === font.id;

					return (
						<button
							key={font.id}
							type="button"
							aria-pressed={selected}
							onClick={() => onChange(font.id)}
							className={`
								flex-1 min-w-[9rem] text-left px-3 py-1.5 rounded-lg border transition
								${font.className}
								${selected
									? "border-purple-600 bg-purple-50 dark:bg-zinc-800"
									: "border-zinc-300 dark:border-zinc-700"
								}
						`}
						>
							<span className="flex items-center justify-between gap-2">
								<span className="text-sm font-semibold">{font.label}</span>
								<span className="text-base leading-none opacity-70" aria-hidden="true">
									Aa
								</span>
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
