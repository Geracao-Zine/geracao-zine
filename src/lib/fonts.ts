export type FontId = "geistSans" | "geistMono";

export type FontFace = {
	id: FontId;
	label: string;
	className: string;
	regular: string;
	bold: string;
};

export const FONTS: FontFace[] = [
	{
		id: "geistSans",
		label: "Geist Sans",
		className: "font-sans",
		regular: "/fonts/geist-regular.ttf",
		bold: "/fonts/geist-bold.ttf",
	},
	{
		id: "geistMono",
		label: "Geist Mono",
		className: "font-mono",
		regular: "/fonts/geist-mono-regular.ttf",
		bold: "/fonts/geist-mono-bold.ttf",
	},
];

export const DEFAULT_FONT_ID: FontId = "geistSans";

// Aceita tanto o id ("geistSans") quanto a classe CSS legada ("font-sans"),
// porque o cadastro envia a classe na URL.
export function resolveFontId(value: string | null | undefined): FontId {
	if (!value) {
		return DEFAULT_FONT_ID;
	}

	const byId = FONTS.find((font) => font.id === value);
	if (byId) {
		return byId.id;
	}

	const byClass = FONTS.find((font) => font.className === value);
	return byClass ? byClass.id : DEFAULT_FONT_ID;
}

export function fontById(id: FontId): FontFace {
	const font = FONTS.find((candidate) => candidate.id === id);
	if (!font) {
		throw new Error(`fonte desconhecida: ${id}`);
	}
	return font;
}
