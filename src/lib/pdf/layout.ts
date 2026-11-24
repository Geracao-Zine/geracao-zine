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

/**
 * Margens e folgas proprias das dobras que passam por corte e dobra.
 *
 * Sao menores que a margem de uma pagina inteira porque cada painel e uma
 * fracao da folha, e o papel ainda perde borda no corte e na dobra. Ficam aqui
 * para nao virar numero solto no modulo de templates.
 */
export const MINIZINE_MARGIN = 28;
export const MINIZINE_GUTTER = 16;
export const BOOKLET_MARGIN = 36;
/** Folga larga na lombada: o grampo nao pode encostar no texto. */
export const BOOKLET_GUTTER = 32;
// Dobras de tres paineis: a folga fica sobre a dobra, que e uma aresta viva.
export const TRIFOLD_MARGIN = 36;
export const TRIFOLD_GUTTER = 24;
// Sanfona: cada painel vira uma dobra, entao a folga se repete muitas vezes e
// precisa ser menor para nao comer a largura util.
export const ACCORDION_MARGIN = 32;
export const ACCORDION_GUTTER = 20;
// Gatefold: as duas portas se encontram no centro; a folga central e maior
// porque ali caem duas dobras encostadas.
export const GATEFOLD_MARGIN = 36;
export const GATEFOLD_GUTTER = 28;
// Livrinho de 16 paginas: 4x4 numa folha retrato. Paineis pequenos, margem e
// folga proporcionais.
export const MINIZINE16_MARGIN = 22;
export const MINIZINE16_GUTTER = 12;
export const CONTENT_WIDTH = A4_PORTRAIT.width - PAGE_MARGIN * 2;

export const A4 = { ...A4_PORTRAIT, margin: PAGE_MARGIN } as const;
export const A4_CONTENT_WIDTH = CONTENT_WIDTH;

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

// Marcas de corte e dobra: curtos, finos e cinza para nao competir com o texto.
// A dobra sai tracejada; o corte, continuo. O comprimento cabe na menor margem
// do catalogo (22 pt) sem invadir o painel.
export const MARK_LENGTH = 14;
export const MARK_OFFSET = 18;
export const MARK_THICKNESS = 0.4;
export const MARK_COLOR = 0.6;
export const MARK_DASH_ARRAY = [3, 3];
// Os cantos recuam proporcionalmente a margem para caber tambem na menor
// margem do catalogo, sem invadir o painel.
export const MARK_OFFSET_RATIO = 0.6;
export const MARK_LENGTH_RATIO = 0.35;

// A margem de seguranca e escolhida em milimetros e desenhada em pontos.
export const PT_PER_MM = 72 / 25.4;

export function mmToPt(mm: number): number {
        return mm * PT_PER_MM;
}
