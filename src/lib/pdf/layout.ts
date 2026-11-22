// Medidas de diagramacao em pontos tipograficos (1 pt = 1/72 pol).
// A4 retrato = 210 x 297 mm = 595 x 842 pt. Paisagem inverte os lados.
export const A4_PORTRAIT = { width: 595, height: 842 } as const;
export const A4_LANDSCAPE = {
	width: A4_PORTRAIT.height,
	height: A4_PORTRAIT.width,
} as const;

export const PAGE_MARGIN = 70;
// Folga entre paineis vizinhos. A dobra fica no meio dela, entao o texto de um
// painel nunca encosta na lombada do outro.
export const PANEL_GUTTER = 24;
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

// Paginas do zine (o painel diagramado, nao a folha A4).
// A area do painel e fixa: a caixa do texto e o que sobra dela depois do
// cabecalho, entao campo opcional vazio devolve a altura para o texto.
export const PANEL_HEIGHT = A4_PORTRAIT.height - PAGE_MARGIN * 2;

// Hierarquia tipografica fixa: titulo > subtitulo > data > corpo.
export const POEM_TITLE_SIZE = 20;
export const POEM_TITLE_LINE_HEIGHT = 26;
export const POEM_SUBTITLE_SIZE = 14;
export const POEM_SUBTITLE_LINE_HEIGHT = 20;
export const POEM_DATE_SIZE = 12;
export const POEM_DATE_LINE_HEIGHT = 16;
// Corpo do texto: o maximo e o teto que a hierarquia permite (abaixo da data),
// o minimo e o piso legivel. A bissecao escolhe o maior corpo inteiro da faixa
// que faz o texto caber na caixa.
export const POEM_BODY_SIZE = 11;
export const POEM_BODY_MAX_SIZE = POEM_DATE_SIZE - 1;
export const POEM_BODY_MIN_SIZE = 7;
export const POEM_LINE_HEIGHT = 16;
// Entrelinha e linha vazia proporcionais ao corpo escolhido.
export const POEM_LINE_HEIGHT_RATIO = POEM_LINE_HEIGHT / POEM_BODY_SIZE;
export const POEM_BLANK_LINE_RATIO = 0.5;

export const POEM_GAP_AFTER_TITLE = 4;
export const POEM_GAP_AFTER_SUBTITLE = 2;
export const POEM_GAP_AFTER_DATE = 2;
export const POEM_GAP_AFTER_HEADER = 24;

export const POEM_DIVIDER_THICKNESS = 0.5;
export const POEM_DIVIDER_COLOR = 0.75;
export const POEM_BODY_COLOR = 0.15;
export const POEM_DATE_COLOR = 0.5;
export const POEM_BLANK_LINE_HEIGHT = POEM_LINE_HEIGHT * POEM_BLANK_LINE_RATIO;

// Texto que nao cabe na caixa segue em pagina de continuacao identificada.
export const POEM_CONTINUATION_LABEL = "continuação";
