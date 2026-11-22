import { json } from "../../../../lib/http.ts";

// O id do cliente OAuth e publico por natureza: ele aparece na URL de
// autorizacao do Google. Servir por rota dinamica evita `NEXT_PUBLIC_*`, que
// seria inlinado no build e deixaria o botao invisivel num build feito sem a
// variavel, e tambem evita marcar toda a home como dinamica so por isso.
export async function GET(): Promise<Response> {
	return json({ googleClientId: process.env.GOOGLE_CLIENT_ID ?? null }, 200);
}
