// Leitura de configuracao em tempo de requisicao, nunca no import: o
// `next build` carrega os modulos sem as variaveis de ambiente de runtime.
export function requireEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Variavel de ambiente ${name} nao configurada`);
	}

	return value;
}
