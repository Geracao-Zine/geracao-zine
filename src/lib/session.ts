import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "session_token";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
	userId: string;
	email: string;
};

const MIN_SECRET_LENGTH = 32;
const encoder = new TextEncoder();

function secret(): Uint8Array {
	const value = process.env.JWT_SECRET;

	if (!value || value.length < MIN_SECRET_LENGTH) {
		throw new Error(`JWT_SECRET ausente ou menor que ${MIN_SECRET_LENGTH} caracteres`);
	}

	return encoder.encode(value);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
	return new SignJWT({ email: payload.email })
		.setProtectedHeader({ alg: "HS256", typ: "JWT" })
		.setSubject(payload.userId)
		.setIssuedAt()
		.setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
		.sign(secret());
}

// Devolve null apenas para token invalido ou expirado. Configuracao faltando
// propaga o erro: um JWT_SECRET ausente e falha de servidor (500), nao um
// visitante anonimo (401), e esconder isso atras de um 401 torna o diagnostico
// impossivel.
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
	const key = secret();

	try {
		const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });

		if (typeof payload.sub !== "string" || payload.sub.length === 0) {
			return null;
		}

		return {
			userId: payload.sub,
			email: typeof payload.email === "string" ? payload.email : "",
		};
	} catch {
		return null;
	}
}

function attributes(maxAge: number): string[] {
	return [
		"HttpOnly",
		"Path=/",
		"SameSite=Lax",
		`Max-Age=${maxAge}`,
		...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
	];
}

export function sessionCookie(token: string): string {
	return [`${SESSION_COOKIE}=${token}`, ...attributes(SESSION_MAX_AGE_SECONDS)].join("; ");
}

export function clearedSessionCookie(): string {
	return [`${SESSION_COOKIE}=`, ...attributes(0)].join("; ");
}

export function withSessionCookie(response: Response, token: string): Response {
	response.headers.append("set-cookie", sessionCookie(token));
	return response;
}

export function withoutSessionCookie(response: Response): Response {
	response.headers.append("set-cookie", clearedSessionCookie());
	return response;
}

export function readSessionCookie(request: Request): string | null {
	const header = request.headers.get("cookie");

	if (!header) {
		return null;
	}

	for (const part of header.split(";")) {
		const separator = part.indexOf("=");

		if (separator === -1) {
			continue;
		}

		if (part.slice(0, separator).trim() === SESSION_COOKIE) {
			const value = part.slice(separator + 1).trim();
			return value.length > 0 ? decodeURIComponent(value) : null;
		}
	}

	return null;
}
