import type { PrismaClient } from "../../generated/prisma/client.ts";
import { signSessionToken } from "../session.ts";
import { createOAuthClient, profileFromCode, type GoogleTokenClient } from "./google.ts";
import { toPublicUser, upsertGoogleUser, type PublicUser } from "./users.ts";

export type LoginResult = {
	user: PublicUser;
	token: string;
};

// Junta as tres etapas do login (code -> perfil -> conta -> sessao) num ponto
// unico, para o route handler ficar so com HTTP.
export async function completeGoogleLogin(options: {
	code: string;
	db: PrismaClient;
	client?: GoogleTokenClient;
}): Promise<LoginResult> {
	const profile = await profileFromCode(options.code, options.client ?? createOAuthClient());
	const user = await upsertGoogleUser(options.db, profile);
	const token = await signSessionToken({ userId: user.id, email: user.email });

	return { user: toPublicUser(user), token };
}
