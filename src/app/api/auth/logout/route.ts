import { isSameOrigin, json } from "../../../../lib/http.ts";
import { withoutSessionCookie } from "../../../../lib/session.ts";

export async function POST(request: Request): Promise<Response> {
	if (!isSameOrigin(request)) {
		return json({ error: "origem_invalida" }, 403);
	}

	return withoutSessionCookie(json({ ok: true }, 200));
}
