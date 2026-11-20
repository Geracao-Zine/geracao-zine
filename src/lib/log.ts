// Unico ponto de log do servidor. O teste no-debug-leftovers proibe `console.*`
// em src/ para barrar depuracao esquecida; este arquivo e a excecao declarada,
// porque erro de rota precisa de rastro e nao pode ser engolido.
export function logError(context: string, error: unknown): void {
	console.error(context, error);
}
