"use client";

type FontOption = {
	id: string;
	label: string;
	className: string;
};

type Props = {
	value: string;
	onChange: (id: string) => void;
	options: FontOption[];
	label?: string;
};

export default function FontSelector({
	value,
	onChange,
	options,
	label,
}: Props) {
	return (
		<div className="space-y-3">
			{label && <p className="font-semibold">{label}</p>}

			<div className="grid grid-cols-1 gap-3">
				{options.map((font) => {
					const selected = value === font.id;

					return (
						<button
							key={font.id}
							type="button"
							onClick={() => onChange(font.id)}
							className={`
                text-left px-4 py-3 rounded-xl border transition
                ${font.className}
                ${selected
									? "border-purple-600 bg-purple-50 dark:bg-zinc-800"
									: "border-zinc-300 dark:border-zinc-700"
								}
              `}
						>
							<div className="text-lg">
								{font.label}
							</div>
							<div className="text-sm opacity-60">
								Exemplo de título
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}