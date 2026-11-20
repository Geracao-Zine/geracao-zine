// Erro com status HTTP para falhas previstas do login. O handler converte em
// resposta; qualquer outra excecao vira 500.
export class AuthError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(code: string, status: number, message?: string) {
		super(message ?? code);
		this.name = "AuthError";
		this.code = code;
		this.status = status;
	}
}
