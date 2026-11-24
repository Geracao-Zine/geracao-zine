/**
 * Como a folha vai para a impressora.
 *
 * `simplex` imprime so a frente: cada face do template e uma folha.
 * `duplex` imprime frente e verso: as faces viram pares, e o verso recebe a
 * imposicao espelhada para os paineis caírem nas mesmas posicoes fisicas.
 */
export type PrintMode = "simplex" | "duplex";

export type PrintModeOption = {
        id: PrintMode;
        label: string;
        description: string;
};

export const PRINT_MODES: PrintModeOption[] = [
        {
                id: "simplex",
                label: "Só frente",
                description: "Uma folha por face. Serve para impressora comum e para quem vai colar ou recortar.",
        },
        {
                id: "duplex",
                label: "Frente e verso",
                description: "Cada face vira um par: o verso sai espelhado para os painéis caírem no mesmo lugar depois de virar a folha.",
        },
];

export const DEFAULT_PRINT_MODE: PrintMode = "simplex";

/**
 * Marcas de corte e dobra nas bordas da folha.
 *
 * Ficam ligadas por padrao: sem elas o autor nao consegue alinhar a dobra e o
 * corte com precisao. A opcao existe para quem vai montar o zine por conta.
 */
export const DEFAULT_MARKS = true;

/**
 * Margem de seguranca em milimetros, aplicada dentro de cada painel.
 *
 * O texto nunca chega a essa faixa, entao uma guilhotina ou uma dobra torta nao
 * corta letra. Os valores sao discretos para o seletor nao virar campo livre.
 */
export const SAFETY_MARGIN_OPTIONS = [0, 3, 5, 8, 10] as const;
export const DEFAULT_SAFETY_MARGIN_MM = 5;

export function isPrintMode(value: unknown): value is PrintMode {
        return value === "simplex" || value === "duplex";
}

/**
 * Normaliza o modo vindo de fora (rascunho salvo).
 *
 * Rascunhos anteriores a este recurso nao tem o campo e caem em `simplex`, que
 * e o comportamento que eles ja tinham.
 */
export function printModeFrom(value: unknown): PrintMode {
        return isPrintMode(value) ? value : DEFAULT_PRINT_MODE;
}

/** Rascunho antigo, sem o campo, mantem as marcas ligadas. */
export function marksFrom(value: unknown): boolean {
        return typeof value === "boolean" ? value : DEFAULT_MARKS;
}

/**
 * Normaliza a margem de seguranca para uma das opcoes do seletor.
 *
 * Um rascunho antigo ou adulterado cai no padrao; um numero valido entre as
 * opcoes e aproximado da mais proxima, para o `<select>` sempre ter valor.
 */
export function safetyMarginFrom(value: unknown): number {
        if (typeof value !== "number" || !Number.isFinite(value)) {
                return DEFAULT_SAFETY_MARGIN_MM;
        }

        const menor = SAFETY_MARGIN_OPTIONS[0];
        const maior = SAFETY_MARGIN_OPTIONS[SAFETY_MARGIN_OPTIONS.length - 1];
        const limitado = Math.min(Math.max(value, menor), maior);

        return SAFETY_MARGIN_OPTIONS.reduce((melhor, opcao) =>
                Math.abs(opcao - limitado) < Math.abs(melhor - limitado) ? opcao : melhor
        );
}

export function printModeOption(mode: PrintMode): PrintModeOption | undefined {
        return PRINT_MODES.find((option) => option.id === mode);
}
