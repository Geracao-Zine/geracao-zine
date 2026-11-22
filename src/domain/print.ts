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

export function printModeOption(mode: PrintMode): PrintModeOption | undefined {
        return PRINT_MODES.find((option) => option.id === mode);
}
