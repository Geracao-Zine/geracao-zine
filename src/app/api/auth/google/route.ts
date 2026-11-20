import { prisma } from "../../../../lib/prisma.ts";
import { completeGoogleLogin } from "../../../../lib/auth/login.ts";
import { AuthError } from "../../../../lib/auth/errors.ts";
import { logError } from "../../../../lib/log.ts";
import { isSameOrigin, json } from "../../../../lib/http.ts";
import { withSessionCookie } from "../../../../lib/session.ts";

export async function POST(request: Request): Promise<Response> {
	if (!isSameOrigin(request)) {
		return json({ error: "origem_invalida" }, 403);
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return json({ error: "json_invalido" }, 400);
	}

	const code = typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;

	if (typeof code !== "string" || code.trim().length === 0) {
		return json({ error: "code_ausente" }, 400);
	}

	try {
		const { user, token } = await completeGoogleLogin({ code, db: prisma });

		return withSessionCookie(json({ user }, 200), token);
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ error: error.code, message: error.message }, error.status);
		}

		// O erro original vai para o log do servidor; o cliente nao recebe detalhe
		// interno (mensagem do Google, SQL, configuracao faltando).
		logError("Falha no login com Google:", error);

		return json({ error: "falha_no_login" }, 500);
	}
}
