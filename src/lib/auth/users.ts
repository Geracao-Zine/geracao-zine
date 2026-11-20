import type { PrismaClient, User } from "../../generated/prisma/client.ts";
import { AuthError } from "./errors.ts";
import type { GoogleProfile } from "./google.ts";

export type PublicUser = {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
	emailVerified: boolean;
};

export function toPublicUser(user: User): PublicUser {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		avatarUrl: user.avatarUrl,
		emailVerified: user.emailVerified,
	};
}

function profileFields(profile: GoogleProfile): {
	name: string | null;
	avatarUrl: string | null;
	emailVerified: boolean;
} {
	return {
		name: profile.name,
		avatarUrl: profile.avatarUrl,
		emailVerified: profile.emailVerified,
	};
}

function isUniqueViolation(error: unknown): boolean {
	if (typeof error !== "object" || error === null) {
		return false;
	}

	return (error as { code?: unknown }).code === "P2002";
}

// Resolve a conta do Google em um registro local.
//
// A ordem importa. O `sub` e a identidade: se ele ja existe, a conta esta
// resolvida e o email armazenado nao e tocado (o email e unico e pode colidir
// com outra conta). O email so serve de chave na primeira entrada, quando
// ainda nao ha `sub` vinculado; e so vincula se a Google confirmou o email,
// senao alguem poderia tomar uma conta alheia criando um perfil com o email
// dela.
export async function upsertGoogleUser(db: PrismaClient, profile: GoogleProfile): Promise<User> {
	const byGoogleId = await db.user.findUnique({ where: { googleId: profile.sub } });

	if (byGoogleId) {
		return db.user.update({ where: { id: byGoogleId.id }, data: profileFields(profile) });
	}

	if (!profile.emailVerified) {
		throw new AuthError("email_not_verified", 403, "A Google nao confirmou este email");
	}

	const byEmail = await db.user.findUnique({ where: { email: profile.email } });

	if (byEmail) {
		if (byEmail.googleId && byEmail.googleId !== profile.sub) {
			throw new AuthError("email_taken", 409, "Este email ja esta vinculado a outra conta Google");
		}

		return db.user.update({
			where: { id: byEmail.id },
			data: { googleId: profile.sub, ...profileFields(profile) },
		});
	}

	try {
		return await db.user.create({
			data: { email: profile.email, googleId: profile.sub, ...profileFields(profile) },
		});
	} catch (error) {
		// Duas requisicoes do mesmo usuario podem passar pelos findUnique acima ao
		// mesmo tempo e disputar o create. Quem perde a corrida encontra o registro
		// do vencedor em vez de devolver 500.
		if (isUniqueViolation(error)) {
			const raced = await db.user.findUnique({ where: { googleId: profile.sub } });

			if (raced) {
				return raced;
			}
		}

		throw error;
	}
}
