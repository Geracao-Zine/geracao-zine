import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

function createClient(): PrismaClient {
	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		throw new Error("DATABASE_URL nao configurada: copie .env.example para .env");
	}

	return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// O hot reload do `next dev` reavalia os modulos a cada edicao. Sem o cache no
// globalThis cada edicao abriria um pool novo e o Postgres estouraria o limite
// de conexoes em poucos minutos. O cache vale tambem em producao: globalThis e
// por processo, entao cada instancia do servidor mantem exatamente um pool.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
	globalForPrisma.prisma ??= createClient();
	return globalForPrisma.prisma;
}

// O client so e criado no primeiro acesso, e nao no import: o `next build`
// avalia os route handlers para descobrir se sao estaticos, e nesse momento
// nao existe DATABASE_URL. Adiar evita que o build falhe por falta de banco.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
	get(_target, prop) {
		const client = getClient();
		const value = Reflect.get(client, prop, client);
		return typeof value === "function" ? value.bind(client) : value;
	},
});
