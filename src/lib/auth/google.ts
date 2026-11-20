import { OAuth2Client } from "google-auth-library";
import { requireEnv } from "../env.ts";
import { AuthError } from "./errors.ts";

export type GoogleProfile = {
	sub: string;
	email: string;
	emailVerified: boolean;
	name: string | null;
	avatarUrl: string | null;
};

type GoogleIdTokenPayload = {
	sub?: string;
	email?: string;
	email_verified?: boolean;
	name?: string;
	picture?: string;
};

// Superficie minima usada do OAuth2Client. Tipar assim mantem a troca de code
// testavel sem carregar o cliente real, que faria chamada de rede ao Google.
export type GoogleTokenClient = {
	getToken(code: string): Promise<{ tokens: { id_token?: string | null } }>;
	verifyIdToken(options: { idToken: string; audience: string }): Promise<{
		getPayload(): GoogleIdTokenPayload | undefined;
	}>;
};

export function createOAuthClient(): OAuth2Client {
	return new OAuth2Client({
		clientId: requireEnv("GOOGLE_CLIENT_ID"),
		clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
		// O fluxo de popup do GIS devolve o code por postMessage, sem redirecionar
		// a pagina. O Google exige este valor literal para aceitar a troca.
		redirectUri: "postmessage",
	});
}

export async function profileFromCode(
	code: string,
	client: GoogleTokenClient = createOAuthClient(),
): Promise<GoogleProfile> {
	const { tokens } = await client.getToken(code);

	if (!tokens.id_token) {
		throw new AuthError("missing_id_token", 502, "Google nao devolveu id_token");
	}

	// A audience e conferida pelo proprio google-auth-library: um id_token
	// emitido para outro cliente e rejeitado aqui.
	const ticket = await client.verifyIdToken({
		idToken: tokens.id_token,
		audience: requireEnv("GOOGLE_CLIENT_ID"),
	});
	const payload = ticket.getPayload();

	if (!payload?.sub || !payload.email) {
		throw new AuthError("invalid_id_token", 401, "id_token sem sub ou email");
	}

	return {
		sub: payload.sub,
		email: payload.email,
		emailVerified: payload.email_verified === true,
		name: payload.name ?? null,
		avatarUrl: payload.picture ?? null,
	};
}
