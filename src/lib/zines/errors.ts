// Erro com status HTTP para falhas previstas da API de zines. O route handler
// converte em resposta; qualquer outra excecao vira 500.
export class ZineError extends Error {
        readonly code: string;
        readonly status: number;

        constructor(code: string, status: number, message?: string) {
                super(message ?? code);
                this.name = "ZineError";
                this.code = code;
                this.status = status;
        }
}
