import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createPrivateKey } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { SignJWT } from "jose";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";
process.env.GOOGLE_CLIENT_ID = "cliente-de-teste.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "segredo-do-google-de-teste";

const { OAuth2Client } = await import("google-auth-library");
const { profileFromCode, createOAuthClient } = await import("../src/lib/auth/google.ts");
const { upsertGoogleUser, toPublicUser } = await import("../src/lib/auth/users.ts");
const { AuthError } = await import("../src/lib/auth/errors.ts");

// Em Node a google-auth-library verifica a assinatura contra certificados PEM
// indexados por `kid`. Geramos um par RSA com um certificado X.509 autoassinado
// para servir de PEM: a verificacao executada e a real da biblioteca.
const KEY_ID = "chave-de-teste";
const material = mkdtempSync(join(tmpdir(), "zine-auth-"));
const chavePrivadaPem = join(material, "key.pem");
const certificadoPem = join(material, "cert.pem");

execFileSync("openssl", [
        "req", "-x509", "-newkey", "rsa:2048", "-nodes",
        "-keyout", chavePrivadaPem, "-out", certificadoPem,
        "-days", "1", "-subj", "/CN=teste",
], { stdio: "ignore" });

const privateKey = createPrivateKey(readFileSync(chavePrivadaPem, "utf8"));
const pemDoCertificado = readFileSync(certificadoPem, "utf8");

after(() => rmSync(material, { recursive: true, force: true }));

async function idToken(claims) {
        const agora = Math.floor(Date.now() / 1000);

        return new SignJWT({
                email: "zine@exemplo.com",
                email_verified: true,
                name: "Autora Zine",
                picture: "https://exemplo.com/a.png",
                ...claims,
        })
                .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
                .setIssuer("https://accounts.google.com")
                .setAudience(process.env.GOOGLE_CLIENT_ID)
                .setSubject("google-sub-123")
                .setIssuedAt(agora)
                .setExpirationTime(agora + 3600)
                .sign(privateKey);
}

// Cliente OAuth2 real, com o unico ponto externo trocado: o transporter que
// baixaria as chaves do Google. A verificacao de assinatura, emissor e audience
// e a de verdade, feita pela google-auth-library.
function clienteComJwksLocal(idTokenValue) {
        const client = new OAuth2Client({
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: "segredo-de-teste",
                redirectUri: "postmessage",
        });

        client.transporter = {
                request: async () => ({ data: { [KEY_ID]: pemDoCertificado }, headers: new Headers() }),
        };
        client.getToken = async () => ({ tokens: { id_token: idTokenValue } });

        return client;
}

test("troca o code por um perfil validando a assinatura do id_token", async () => {
        const client = clienteComJwksLocal(await idToken({}));
        const perfil = await profileFromCode("code-valido", client);

        assert.deepEqual(perfil, {
                sub: "google-sub-123",
                email: "zine@exemplo.com",
                emailVerified: true,
                name: "Autora Zine",
                avatarUrl: "https://exemplo.com/a.png",
        });
});

test("id_token assinado por outra chave e rejeitado", async () => {
        const outraChave = createPrivateKey(
                execFileSync("openssl", ["genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048"]).toString(),
        );
        const agora = Math.floor(Date.now() / 1000);
        const forjado = await new SignJWT({ email: "invasor@exemplo.com", email_verified: true })
                .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
                .setIssuer("https://accounts.google.com")
                .setAudience(process.env.GOOGLE_CLIENT_ID)
                .setSubject("sub-forjado")
                .setIssuedAt(agora)
                .setExpirationTime(agora + 3600)
                .sign(outraChave);

        await assert.rejects(() => profileFromCode("code", clienteComJwksLocal(forjado)), /signature|Signature|invalid/i);
});

test("id_token de outro cliente (audience errada) e rejeitado", async () => {
        const agora = Math.floor(Date.now() / 1000);
        const deOutroCliente = await new SignJWT({ email: "a@b.com", email_verified: true })
                .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
                .setIssuer("https://accounts.google.com")
                .setAudience("outro-cliente.apps.googleusercontent.com")
                .setSubject("s")
                .setIssuedAt(agora)
                .setExpirationTime(agora + 3600)
                .sign(privateKey);

        await assert.rejects(() => profileFromCode("code", clienteComJwksLocal(deOutroCliente)), /audience/i);
});

test("sem id_token a troca falha como 502", async () => {
        const client = clienteComJwksLocal(null);
        client.getToken = async () => ({ tokens: {} });

        await assert.rejects(
                () => profileFromCode("code", client),
                (erro) => erro instanceof AuthError && erro.status === 502,
        );
});

test("o cliente OAuth usa o redirect postmessage exigido pelo popup", () => {
        const client = createOAuthClient();

        assert.equal(client.redirectUri, "postmessage");
});

// --- integracao com Postgres real -------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
const semBanco = !DATABASE_URL;

if (semBanco) {
        test("integracao com Postgres (pulada: DATABASE_URL ausente)", { skip: true }, () => {});
} else {
        const { PrismaPg } = await import("@prisma/adapter-pg");
        const { PrismaClient } = await import("../src/generated/prisma/client.ts");

        const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

        before(async () => {
                await db.user.deleteMany({ where: { email: { endsWith: "@teste-auth.local" } } });
        });

        beforeEach(async () => {
                await db.user.deleteMany({ where: { email: { endsWith: "@teste-auth.local" } } });
        });

        after(async () => {
                await db.user.deleteMany({ where: { email: { endsWith: "@teste-auth.local" } } });
                await db.$disconnect();
        });

        const perfil = (over = {}) => ({
                sub: "sub-1",
                email: "ana@teste-auth.local",
                emailVerified: true,
                name: "Ana",
                avatarUrl: null,
                ...over,
        });

        test("cria a conta na primeira entrada", async () => {
                const user = await upsertGoogleUser(db, perfil());

                assert.equal(user.email, "ana@teste-auth.local");
                assert.equal(user.googleId, "sub-1");
                assert.equal(user.emailVerified, true);
                assert.match(user.id, /^[0-9a-f-]{36}$/);
        });

        test("a segunda entrada reaproveita a conta, sem duplicar", async () => {
                const primeira = await upsertGoogleUser(db, perfil());
                const segunda = await upsertGoogleUser(db, perfil({ name: "Ana Maria" }));

                assert.equal(segunda.id, primeira.id);
                assert.equal(segunda.name, "Ana Maria");
                assert.equal(await db.user.count({ where: { email: "ana@teste-auth.local" } }), 1);
        });

        test("vincula o googleId quando o email ja existe sem vinculo", async () => {
                const existente = await db.user.create({
                        data: { email: "bia@teste-auth.local", name: "Bia" },
                });

                const user = await upsertGoogleUser(
                        db,
                        perfil({ sub: "sub-bia", email: "bia@teste-auth.local", name: "Bia Google" }),
                );

                assert.equal(user.id, existente.id);
                assert.equal(user.googleId, "sub-bia");
        });

        test("email nao verificado nao toma conta existente", async () => {
                await db.user.create({ data: { email: "carla@teste-auth.local" } });

                await assert.rejects(
                        () => upsertGoogleUser(db, perfil({ sub: "sub-carla", email: "carla@teste-auth.local", emailVerified: false })),
                        (erro) => erro instanceof AuthError && erro.status === 403,
                );

                const carla = await db.user.findUnique({ where: { email: "carla@teste-auth.local" } });
                assert.equal(carla.googleId, null);
        });

        test("email ja vinculado a outro googleId nao e roubado", async () => {
                await db.user.create({ data: { email: "duda@teste-auth.local", googleId: "sub-dono" } });

                await assert.rejects(
                        () => upsertGoogleUser(db, perfil({ sub: "sub-invasor", email: "duda@teste-auth.local" })),
                        (erro) => erro instanceof AuthError && erro.status === 409,
                );
        });

        test("a conta pelo googleId nao troca de email quando a Google muda o email", async () => {
                const original = await upsertGoogleUser(db, perfil());

                const user = await upsertGoogleUser(
                        db,
                        perfil({ email: "ana.nova@teste-auth.local", name: "Ana Nova" }),
                );

                assert.equal(user.id, original.id);
                assert.equal(user.email, "ana@teste-auth.local");
                assert.equal(user.name, "Ana Nova");
        });

        test("dados publicos nao vazam campos internos", async () => {
                const user = await upsertGoogleUser(db, perfil());
                const publico = toPublicUser(user);

                assert.deepEqual(Object.keys(publico).sort(), ["avatarUrl", "email", "emailVerified", "id", "name"]);
                assert.equal(publico.googleId, undefined);
                assert.equal(publico.createdAt, undefined);
        });
}
