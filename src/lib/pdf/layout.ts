// Medidas de diagramacao em pontos tipograficos (1 pt = 1/72 pol).
// A4 retrato = 210 x 297 mm = 595 x 842 pt. Paisagem inverte os lados.
export const A4_PORTRAIT = { width: 595, height: 842 } as const;
export const A4_LANDSCAPE = {
	width: A4_PORTRAIT.height,
	height: A4_PORTRAIT.width,
} as const;

export const PAGE_MARGIN = 70;
export const CONTENT_WIDTH = A4_PORTRAIT.width - PAGE_MARGIN * 2;

export const A4 = { ...A4_PORTRAIT, margin: PAGE_MARGIN } as const;
export const A4_CONTENT_WIDTH = CONTENT_WIDTH;

// Capa
export const COVER_TITLE_SIZE = 30;
export const COVER_TITLE_LINE_HEIGHT = 38;
export const COVER_AUTHOR_SIZE = 14;
export const COVER_DATE_SIZE = 10;
export const COVER_GAP_TITLE_TO_AUTHOR = 40;
export const COVER_GAP_AUTHOR_TO_DATE = 10;
export const COVER_DIVIDER_WIDTH = 60;
export const COVER_DIVIDER_THICKNESS = 1;
export const COVER_DIVIDER_COLOR = 0.6;
export const COVER_DATE_COLOR = 0.5;

// Paginas de poema
export const POEM_TITLE_SIZE = 20;
export const POEM_BODY_SIZE = 13;
export const POEM_LINE_HEIGHT = 22;
export const POEM_TITLE_LINE_HEIGHT = POEM_TITLE_SIZE + 6;
export const POEM_GAP_AFTER_TITLE = 6;
export const POEM_GAP_AFTER_DIVIDER = 30;
export const POEM_DIVIDER_THICKNESS = 0.5;
export const POEM_DIVIDER_COLOR = 0.75;
export const POEM_BODY_COLOR = 0.15;
export const POEM_BLANK_LINE_HEIGHT = POEM_LINE_HEIGHT / 2;
