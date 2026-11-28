import { prisma } from "../../../lib/prisma.ts";
import { isSameOrigin, json } from "../../../lib/http.ts";
import { logError } from "../../../lib/log.ts";
import {
        ZineError,
        createZine,
        listFavoritedZines,
        listOwnZines,
        listPublicZines,
        newZineFrom,
        ownerIdFromSession,
} from "../../../lib/zines/index.ts";

// Erro previsto vira resposta com o status que ele carrega; o resto vira 500,
// sem detalhe interno (mensagem do Prisma, SQL) para o cliente.
function falha(error: unknown): Response {
        if (error instanceof ZineError) {
                return json({ error: error.code, message: error.message }, error.status);
        }

        logError("Falha na API de zines:", error);

        return json({ error: "falha_interna" }, 500);
}

/**
 * Tres escopos, porque sao tres perguntas diferentes:
 *
 * - `public`: a biblioteca. Sem sessao tambem responde, e com sessao marca
 *   `favorited` para o coracao aparecer certo.
 * - `favorites`: o que a pessoa salvou. Exige sessao.
 * - sem escopo: os zines do dono, inclusive os privados.
 */
export async function GET(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const escopo = url.searchParams.get("scope");

        try {
                // Sessao opcional: um visitante ve a biblioteca, so nao ve favoritos.
                // Token forjado, porem, continua sendo erro: engoli-lo faria um
                // cookie invalido passar por visitante.
                const viewerId = await ownerIdFromSession(request).catch((error: unknown) => {
                        if (error instanceof ZineError && error.code === "nao_autenticado") {
                                return null;
                        }

                        throw error;
                });

                if (escopo === "public") {
                        return json({ zines: await listPublicZines(prisma, viewerId) }, 200);
                }

                if (escopo === "favorites") {
                        if (!viewerId) {
                                throw new ZineError("nao_autenticado", 401);
                        }

                        return json({ zines: await listFavoritedZines(prisma, viewerId) }, 200);
                }

                if (!viewerId) {
                        throw new ZineError("nao_autenticado", 401);
                }

                return json({ zines: await listOwnZines(prisma, viewerId) }, 200);
        } catch (error) {
                return falha(error);
        }
}

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

        try {
                const ownerId = await ownerIdFromSession(request);
                // `newZineFrom` descarta qualquer `ownerId` que venha no corpo:
                // o dono e sempre o da sessao.
                const novos = newZineFrom(body);

                return json({ zine: await createZine(prisma, ownerId, novos) }, 201);
        } catch (error) {
                return falha(error);
        }
}
