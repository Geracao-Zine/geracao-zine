export type ZineFormat =
        | "banner-a4"
        | "duas-colunas-vertical"
        | "duas-colunas-horizontal"
        | "quatro-retangulos"
        | "mini-zine"
        | "saddle-stitch";

export type FormatOrientation = "portrait" | "landscape";

export type FormatOption = {
        id: ZineFormat;
        label: string;
        description: string;
        badge: string;
        available: boolean;
        /** Paineis diagramados por face; 0 enquanto o template nao existe. */
        panelsPerFace: number;
        orientation: FormatOrientation;
};

export const FORMAT_OPTIONS: FormatOption[] = [
        {
                id: "banner-a4",
                label: "Banner A4",
                description: "Uma poesia por folha, leitura em pé. A dobra mais simples.",
                badge: "Disponível",
                available: true,
                panelsPerFace: 1,
                orientation: "portrait",
        },
        {
                id: "duas-colunas-vertical",
                label: "Duas colunas vertical",
                description: "Dobra vertical no meio: dois painéis por face, lidos da esquerda para a direita.",
                badge: "Disponível",
                available: true,
                panelsPerFace: 2,
                orientation: "portrait",
        },
        {
                id: "duas-colunas-horizontal",
                label: "Duas colunas horizontal",
                description: "Dobra horizontal no meio: dois painéis por face, lidos de cima para baixo.",
                badge: "Disponível",
                available: true,
                panelsPerFace: 2,
                orientation: "landscape",
        },
        {
                id: "quatro-retangulos",
                label: "Quatro retângulos",
                description: "Dobra em cruz: quatro painéis por face, lidos em Z (esquerda para a direita, cima para baixo).",
                badge: "Disponível",
                available: true,
                panelsPerFace: 4,
                orientation: "portrait",
        },
        {
                id: "mini-zine",
                label: "Minizine de 1 folha",
                description: "Uma única folha A4, dobrada e cortada ao meio. Vira um livrinho de 8 páginas.",
                badge: "Disponível",
                available: true,
                panelsPerFace: 8,
                orientation: "landscape",
        },
        {
                id: "saddle-stitch",
                label: "Fanzine grampeado",
                description: "Várias folhas dobradas e grampeadas na lombada, crescendo em múltiplos de 4.",
                badge: "Disponível",
                available: true,
                panelsPerFace: 2,
                orientation: "landscape",
        },
];

export const DEFAULT_FORMAT: ZineFormat = "banner-a4";

/** Formatos salvos por versoes anteriores do rascunho. */
const LEGACY_FORMATS: Record<string, ZineFormat> = {
        reading: "banner-a4",
};

/**
 * Normaliza um formato vindo de fora (rascunho salvo, URL).
 *
 * O "so para ler" antigo era o banner A4 com outro nome; aceitar o apelido
 * evita descartar o rascunho de quem ja usava a aplicacao.
 */
export function formatFrom(value: unknown): ZineFormat {
        if (typeof value !== "string") {
                return DEFAULT_FORMAT;
        }

        const legacy = LEGACY_FORMATS[value];
        if (legacy) {
                return legacy;
        }

        const option = FORMAT_OPTIONS.find((candidate) => candidate.id === value);
        return option ? option.id : DEFAULT_FORMAT;
}

export function isZineFormat(value: unknown): value is ZineFormat {
        return (
                typeof value === "string" &&
                FORMAT_OPTIONS.some((option) => option.id === value)
        );
}

export function formatOption(format: ZineFormat): FormatOption | undefined {
        return FORMAT_OPTIONS.find((candidate) => candidate.id === format);
}

export function isFormatAvailable(format: ZineFormat): boolean {
        return formatOption(format)?.available ?? false;
}

export function panelsPerFace(format: ZineFormat): number {
        return formatOption(format)?.panelsPerFace ?? 0;
}
