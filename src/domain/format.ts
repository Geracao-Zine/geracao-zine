export type ZineFormat = "mini-zine" | "saddle-stitch" | "reading";

export type FormatOption = {
	id: ZineFormat;
	label: string;
	description: string;
	badge: string;
	available: boolean;
};

export const FORMAT_OPTIONS: FormatOption[] = [
	{
		id: "reading",
		label: "Só pra ler",
		description: "Uma página por poema, sem dobra. Ideal pra tela ou impressão simples.",
		badge: "Disponível",
		available: true,
	},
	{
		id: "mini-zine",
		label: "Minizine de 1 folha",
		description: "Uma única folha A4, dobrada e cortada ao meio. Vira um livrinho de 8 páginas.",
		badge: "Em breve",
		available: false,
	},
	{
		id: "saddle-stitch",
		label: "Fanzine grampeado",
		description: "Várias folhas dobradas e grampeadas na lombada, crescendo em múltiplos de 4.",
		badge: "Em breve",
		available: false,
	},
];

export const DEFAULT_FORMAT: ZineFormat = "reading";

export function isFormatAvailable(format: ZineFormat): boolean {
	const option = FORMAT_OPTIONS.find((candidate) => candidate.id === format);
	return option ? option.available : false;
}
