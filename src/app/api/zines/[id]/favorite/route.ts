import { prisma } from "../../../../../lib/prisma.ts";
import { isSameOrigin, json } from "../../../../../lib/http.ts";
import { logError } from "../../../../../lib/log.ts";
import {
        ZineError,
        favoriteZine,
        ownerIdFromSession,
        unfavoriteZine,
} from "../../../../../lib/zines/index.ts";

function falha(error: unknown): Response {
        if (error instanceof ZineError) {
                return json({ error: error.code, message: error.message }, error.status);
        }

        logError("Falha ao favoritar zine:", error);

        return json({ error: "falha_interna" }, 500);
}

type Contexto = { params: Promise<{ id: string }> };

async function idDoPedido(contexto: Contexto): Promise<string> {
        const { id } = await contexto.params;

        return id;
}

/** Favoritar e idempotente: repetir o pedido deixa o mesmo estado. */
export async function POST(request: Request, contexto: Contexto): Promise<Response> {
        if (!isSameOrigin(request)) {
                return json({ error: "origem_invalida" }, 403);
        }

        try {
                const userId = await ownerIdFromSession(request);
                const id = await idDoPedido(contexto);

                return json({ zine: await favoriteZine(prisma, userId, id) }, 200);
        } catch (error) {
                return falha(error);
        }
}

/** Desfavoritar o que nao estava favoritado responde 204 do mesmo jeito. */
export async function DELETE(request: Request, contexto: Contexto): Promise<Response> {
        if (!isSameOrigin(request)) {
                return json({ error: "origem_invalida" }, 403);
        }

        try {
                const userId = await ownerIdFromSession(request);
                const id = await idDoPedido(contexto);

                await unfavoriteZine(prisma, userId, id);

                return new Response(null, { status: 204 });
        } catch (error) {
                return falha(error);
        }
}
