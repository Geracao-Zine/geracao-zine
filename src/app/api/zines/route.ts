import { prisma } from "../../../lib/prisma.ts";
import { isSameOrigin, json } from "../../../lib/http.ts";
import { logError } from "../../../lib/log.ts";
import {
        ZineError,
        createZine,
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
 * GET sem sessao lista so os zines publicos, que e o que qualquer visitante
 * pode ver. Com sessao, lista os do dono: o autor precisa achar os proprios
 * zines, inclusive os privados.
 */
export async function GET(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const escopo = url.searchParams.get("scope");

        if (escopo === "public") {
                try {
                        return json({ zines: await listPublicZines(prisma) }, 200);
                } catch (error) {
                        return falha(error);
                }
        }

        try {
                const ownerId = await ownerIdFromSession(request);
                return json({ zines: await listOwnZines(prisma, ownerId) }, 200);
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
