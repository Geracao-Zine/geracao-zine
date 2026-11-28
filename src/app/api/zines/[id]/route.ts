import { prisma } from "../../../../lib/prisma.ts";
import { isSameOrigin, json } from "../../../../lib/http.ts";
import { logError } from "../../../../lib/log.ts";
import {
        ZineError,
        deleteZine,
        getOwnZine,
        getPublicZine,
        ownerIdFromSession,
        updateZine,
        zinePatchFrom,
} from "../../../../lib/zines/index.ts";

function falha(error: unknown): Response {
        if (error instanceof ZineError) {
                return json({ error: error.code, message: error.message }, error.status);
        }

        logError("Falha na API de zines:", error);

        return json({ error: "falha_interna" }, 500);
}

type Contexto = { params: Promise<{ id: string }> };

async function idDoPedido(contexto: Contexto): Promise<string> {
        const { id } = await contexto.params;

        return id;
}

/**
 * Com sessao, tenta primeiro como dono (assim o autor ve o proprio zine, mesmo
 * privado). Se nao for dele, cai para a leitura publica: um zine publico de
 * outra pessoa continua visivel, e um privado alheio responde 404 nos dois
 * caminhos, sem revelar que existe.
 */
export async function GET(request: Request, contexto: Contexto): Promise<Response> {
        try {
                const id = await idDoPedido(contexto);
                const dono = await ownerIdFromSession(request).catch(() => null);

                if (dono) {
                        try {
                                return json({ zine: await getOwnZine(prisma, dono, id) }, 200);
                        } catch (error) {
                                if (!(error instanceof ZineError) || error.status !== 404) {
                                        throw error;
                                }
                        }
                }

                return json({ zine: await getPublicZine(prisma, id, dono) }, 200);
        } catch (error) {
                return falha(error);
        }
}

export async function PATCH(request: Request, contexto: Contexto): Promise<Response> {
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
                const id = await idDoPedido(contexto);
                const patch = zinePatchFrom(body);

                return json({ zine: await updateZine(prisma, ownerId, id, patch) }, 200);
        } catch (error) {
                return falha(error);
        }
}

export async function DELETE(request: Request, contexto: Contexto): Promise<Response> {
        if (!isSameOrigin(request)) {
                return json({ error: "origem_invalida" }, 403);
        }

        try {
                const ownerId = await ownerIdFromSession(request);
                const id = await idDoPedido(contexto);

                await deleteZine(prisma, ownerId, id);

                return new Response(null, { status: 204 });
        } catch (error) {
                return falha(error);
        }
}
