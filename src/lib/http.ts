export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json", ...headers },
	});
}

// Compara o Origin com o Host da requisicao. Serve contra login CSRF: sem isso
// um site terceiro pode postar um `code` do proprio atacante e deixar a vitima
// logada na conta dele. Origin ausente e aceito porque clientes que nao sao
// navegador (curl, testes) nao enviam o cabecalho, e um navegador sempre envia
// em POST cross-site.
export function isSameOrigin(request: Request): boolean {
	const origin = request.headers.get("origin");

	if (!origin) {
		return true;
	}

	const host = request.headers.get("host");

	if (!host) {
		return false;
	}

	try {
		return new URL(origin).host === host;
	} catch {
		return false;
	}
}
