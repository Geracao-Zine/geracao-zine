import { readSessionCookie, verifySessionToken } from "../session.ts";
import { ZineError } from "./errors.ts";

/**
 * Id do dono da sessao, ou 401.
 *
 * As rotas de zine nao tem outra fonte de `ownerId`: aceitar um id vindo do
 * corpo ou da query deixaria qualquer pessoa ler ou apagar o zine dos outros
 * bastando saber o id.
 */
export async function ownerIdFromSession(request: Request): Promise<string> {
        const token = readSessionCookie(request);

        if (!token) {
                throw new ZineError("nao_autenticado", 401);
        }

        const session = await verifySessionToken(token);

        if (!session) {
                throw new ZineError("sessao_invalida", 401);
        }

        return session.userId;
}
