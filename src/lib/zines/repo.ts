import type { PrismaClient } from "../../generated/prisma/client.ts";
import type { InputJsonValue } from "../../generated/prisma/internal/prismaNamespace.ts";
import type { ZineModel } from "../../generated/prisma/models/Zine.ts";
import type { Visibility, ZinePatch } from "./input.ts";
import { ZineError } from "./errors.ts";
import { slugWithSuffix, slugify } from "./slug.ts";

export type ZineAuthor = {
        name: string | null;
        avatarUrl: string | null;
};

/**
 * O que sai para o cliente. Igual ao model, menos `ownerId`: o dono ja e quem
 * fez a requisicao, e devolver o campo so daria motivo para tentar envia-lo de
 * volta. `mine` existe para a tela nao precisar comparar ids que nao recebe.
 */
export type PublicZine = {
        id: string;
        title: string;
        visibility: Visibility;
        content: unknown;
        contentVersion: number;
        slug: string | null;
        createdAt: string;
        updatedAt: string;
        /** Quem escreveu: a biblioteca publica precisa creditar o autor. */
        author: ZineAuthor;
        /** Verdadeiro quando quem pediu e o dono. */
        mine: boolean;
        favorited: boolean;
};

type ZineComAutor = ZineModel & { owner?: ZineAuthor | null };

/**
 * `viewerId` decide `mine`; `favorited` vem de quem consultou, porque depende
 * da tabela de favoritos e nao da linha do zine.
 */
export function toPublicZine(
        zine: ZineComAutor,
        viewerId: string | null = null,
        favorited = false
): PublicZine {
        return {
                id: zine.id,
                title: zine.title,
                visibility: zine.visibility as Visibility,
                content: zine.content,
                contentVersion: zine.contentVersion,
                slug: zine.slug,
                createdAt: zine.createdAt.toISOString(),
                updatedAt: zine.updatedAt.toISOString(),
                author: {
                        name: zine.owner?.name ?? null,
                        avatarUrl: zine.owner?.avatarUrl ?? null,
                },
                mine: viewerId !== null && zine.ownerId === viewerId,
                favorited,
        };
}

const AUTOR = { select: { name: true, avatarUrl: true } } as const;

function isUniqueViolation(error: unknown): boolean {
        return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

async function slugIsTaken(db: PrismaClient, slug: string, id: string): Promise<boolean> {
        const existente = await db.zine.findUnique({ where: { slug } });

        return existente !== null && existente.id !== id;
}

// Um slug so e definido quando o zine fica publico, entao ele nunca aparece
// numa URL privada. Se duas pessoas publicarem "meu-zine", a segunda recebe um
// sufixo em vez de um erro: colidir titulo nao pode impedir a publicacao.
async function slugFor(db: PrismaClient, title: string, id: string): Promise<string> {
        const base = slugify(title);

        if (!(await slugIsTaken(db, base, id)) && base.length > 0) {
                return base;
        }

        return slugWithSuffix(base, id);
}

/** Ids dos zines que `userId` favoritou, para marcar a lista numa consulta so. */
async function favoritedIds(db: PrismaClient, userId: string | null): Promise<Set<string>> {
        if (!userId) {
                return new Set();
        }

        const linhas = await db.favorite.findMany({ where: { userId }, select: { zineId: true } });

        return new Set(linhas.map((linha) => linha.zineId));
}

export async function listOwnZines(db: PrismaClient, ownerId: string): Promise<PublicZine[]> {
        const zines = await db.zine.findMany({
                where: { ownerId },
                orderBy: { updatedAt: "desc" },
                include: { owner: AUTOR },
        });

        const favoritos = await favoritedIds(db, ownerId);

        return zines.map((zine) => toPublicZine(zine, ownerId, favoritos.has(zine.id)));
}

export async function listPublicZines(
        db: PrismaClient,
        viewerId: string | null = null
): Promise<PublicZine[]> {
        const zines = await db.zine.findMany({
                where: { visibility: "public" },
                orderBy: { updatedAt: "desc" },
                include: { owner: AUTOR },
        });

        const favoritos = await favoritedIds(db, viewerId);

        return zines.map((zine) => toPublicZine(zine, viewerId, favoritos.has(zine.id)));
}

/**
 * Zines favoritados por quem pediu.
 *
 * Filtra por `public`: um zine que era publico quando foi favoritado pode ter
 * virado privado depois, e nesse caso ele sai da lista em vez de continuar
 * visivel pelo favorito.
 */
export async function listFavoritedZines(db: PrismaClient, userId: string): Promise<PublicZine[]> {
        const zines = await db.zine.findMany({
                where: { visibility: "public", favorites: { some: { userId } } },
                orderBy: { updatedAt: "desc" },
                include: { owner: AUTOR },
        });

        return zines.map((zine) => toPublicZine(zine, userId, true));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Um id fora do formato de uuid faz o Prisma lancar erro de validacao, que
// viraria 500. Para quem chama, um id assim e simplesmente um zine que nao
// existe: 404.
function assertUuid(id: string): void {
        if (!UUID.test(id)) {
                throw new ZineError("zine_nao_encontrado", 404);
        }
}

/**
 * Busca um zine do dono da sessao.
 *
 * Zine de outro dono responde exatamente como zine inexistente, com 404: um 403
 * confirmaria que o id existe e deixaria alguem enumerar os zines alheios.
 */
async function ownZineOr404(db: PrismaClient, ownerId: string, id: string): Promise<ZineModel> {
        assertUuid(id);

        const zine = await db.zine.findFirst({ where: { id, ownerId } });

        if (!zine) {
                throw new ZineError("zine_nao_encontrado", 404);
        }

        return zine;
}

export async function getOwnZine(db: PrismaClient, ownerId: string, id: string): Promise<PublicZine> {
        assertUuid(id);

        const zine = await db.zine.findFirst({ where: { id, ownerId }, include: { owner: AUTOR } });

        if (!zine) {
                throw new ZineError("zine_nao_encontrado", 404);
        }

        const favoritos = await favoritedIds(db, ownerId);

        return toPublicZine(zine, ownerId, favoritos.has(zine.id));
}

export async function getPublicZine(
        db: PrismaClient,
        id: string,
        viewerId: string | null = null
): Promise<PublicZine> {
        assertUuid(id);

        const zine = await db.zine.findFirst({
                where: { id, visibility: "public" },
                include: { owner: AUTOR },
        });

        if (!zine) {
                throw new ZineError("zine_nao_encontrado", 404);
        }

        const favoritos = await favoritedIds(db, viewerId);

        return toPublicZine(zine, viewerId, favoritos.has(zine.id));
}

export async function createZine(
        db: PrismaClient,
        ownerId: string,
        dados: { title: string; content: InputJsonValue; contentVersion: number; visibility: Visibility }
): Promise<PublicZine> {
        // O slug depende do id (sufixo de desempate), e o id so existe depois do
        // create. Por isso o zine nasce sem slug e ele e definido no passo
        // seguinte, quando ja da para checar colisao com o id em maos.
        const zine = await db.zine.create({
                data: {
                        ownerId,
                        title: dados.title,
                        content: dados.content,
                        contentVersion: dados.contentVersion,
                        visibility: dados.visibility,
                },
                include: { owner: AUTOR },
        });

        if (dados.visibility !== "public") {
                return toPublicZine(zine, ownerId);
        }

        const comSlug = await db.zine.update({
                where: { id: zine.id },
                data: { slug: await slugFor(db, dados.title, zine.id) },
                include: { owner: AUTOR },
        });

        return toPublicZine(comSlug, ownerId);
}

/**
 * Atualiza um zine do dono.
 *
 * O slug acompanha a visibilidade: nasce ao publicar, e some ao voltar para
 * privado, porque a doc do model diz que ele e nulo enquanto o zine e privado.
 */
export async function updateZine(
        db: PrismaClient,
        ownerId: string,
        id: string,
        patch: ZinePatch
): Promise<PublicZine> {
        await ownZineOr404(db, ownerId, id);

        const data: {
                title?: string;
                content?: InputJsonValue;
                contentVersion?: number;
                visibility?: Visibility;
                slug?: string | null;
        } = {};

        if (patch.title !== undefined) {
                data.title = patch.title;
        }

        if (patch.content !== undefined) {
                data.content = patch.content as InputJsonValue;
        }

        if (patch.contentVersion !== undefined) {
                data.contentVersion = patch.contentVersion;
        }

        if (patch.visibility !== undefined) {
                data.visibility = patch.visibility;

                if (patch.visibility === "private") {
                        data.slug = null;
                }
        }

        // O slug depende do titulo final e da visibilidade final, por isso so e
        // recalculado depois de saber as duas.
        const alvo = await db.zine.findUniqueOrThrow({ where: { id } });
        const tituloFinal = data.title ?? alvo.title;
        const visibilidadeFinal = data.visibility ?? (alvo.visibility as Visibility);

        if (visibilidadeFinal === "public" && alvo.slug === null) {
                data.slug = await slugFor(db, tituloFinal, id);
        }

        try {
                const zine = await db.zine.update({ where: { id }, data, include: { owner: AUTOR } });
                return toPublicZine(zine, ownerId);
        } catch (error) {
                // Duas publicacoes simultaneas com o mesmo titulo podem escolher o
                // mesmo slug entre a checagem e o update. Quem perde a corrida tenta
                // de novo com sufixo, em vez de devolver 500.
                if (isUniqueViolation(error) && visibilidadeFinal === "public") {
                        const zine = await db.zine.update({
                                where: { id },
                                data: { ...data, slug: slugWithSuffix(slugify(tituloFinal), id) },
                                include: { owner: AUTOR },
                        });

                        return toPublicZine(zine, ownerId);
                }

                throw error;
        }
}

export async function deleteZine(db: PrismaClient, ownerId: string, id: string): Promise<void> {
        await ownZineOr404(db, ownerId, id);
        await db.zine.delete({ where: { id } });
}

/**
 * Favorita um zine publico.
 *
 * Idempotente: favoritar duas vezes (dois cliques, duas abas) deixa uma linha
 * so, em vez de estourar a chave unica como erro para quem clicou. Zine privado
 * responde 404 mesmo existindo: o favorito nao pode ser um atalho para
 * descobrir zine alheio.
 */
export async function favoriteZine(db: PrismaClient, userId: string, zineId: string): Promise<PublicZine> {
        assertUuid(zineId);

        const zine = await db.zine.findFirst({
                where: { id: zineId, visibility: "public" },
                include: { owner: AUTOR },
        });

        if (!zine) {
                throw new ZineError("zine_nao_encontrado", 404);
        }

        try {
                await db.favorite.create({ data: { userId, zineId } });
        } catch (error) {
                // P2002 aqui significa "ja estava favoritado", que e o estado desejado.
                if (!isUniqueViolation(error)) {
                        throw error;
                }
        }

        return toPublicZine(zine, userId, true);
}

/** Remove o favorito. Desfavoritar o que nao estava favoritado nao e erro. */
export async function unfavoriteZine(db: PrismaClient, userId: string, zineId: string): Promise<void> {
        assertUuid(zineId);
        await db.favorite.deleteMany({ where: { userId, zineId } });
}
