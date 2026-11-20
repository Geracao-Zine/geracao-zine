import { prisma } from "../../../../lib/prisma.ts";
import { toPublicUser } from "../../../../lib/auth/users.ts";
import { json } from "../../../../lib/http.ts";
import { readSessionCookie, verifySessionToken } from "../../../../lib/session.ts";

export async function GET(request: Request): Promise<Response> {
	const token = readSessionCookie(request);

	if (!token) {
		return json({ error: "nao_autenticado" }, 401);
	}

	const session = await verifySessionToken(token);

	if (!session) {
		return json({ error: "sessao_invalida" }, 401);
	}

	const user = await prisma.user.findUnique({ where: { id: session.userId } });

	if (!user) {
		return json({ error: "usuario_nao_encontrado" }, 401);
	}

	return json({ user: toPublicUser(user) }, 200);
}
