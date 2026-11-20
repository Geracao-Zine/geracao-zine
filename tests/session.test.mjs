import assert from "node:assert/strict";
import { test } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";

const {
        SESSION_COOKIE,
        SESSION_MAX_AGE_SECONDS,
        clearedSessionCookie,
        readSessionCookie,
        sessionCookie,
        signSessionToken,
        verifySessionToken,
        withSessionCookie,
        withoutSessionCookie,
} = await import("../src/lib/session.ts");

test("assina e verifica uma sessao", async () => {
        const token = await signSessionToken({ userId: "u-1", email: "a@b.com" });
        const payload = await verifySessionToken(token);

        assert.deepEqual(payload, { userId: "u-1", email: "a@b.com" });
});

test("o token tem tres partes e nao carrega o segredo", async () => {
        const token = await signSessionToken({ userId: "u-1", email: "a@b.com" });

        assert.equal(token.split(".").length, 3);
        assert.ok(!token.includes(process.env.JWT_SECRET));
});

test("token adulterado e rejeitado", async () => {
        const token = await signSessionToken({ userId: "u-1", email: "a@b.com" });
        const [header, , signature] = token.split(".");
        const outroPayload = Buffer.from(JSON.stringify({ sub: "u-2", email: "x@y.com" })).toString("base64url");

        assert.equal(await verifySessionToken(`${header}.${outroPayload}.${signature}`), null);
});

test("token assinado com outro segredo e rejeitado", async () => {
        const token = await signSessionToken({ userId: "u-1", email: "a@b.com" });
        process.env.JWT_SECRET = "outro-segredo-com-mais-de-32-caracteres-aqui!!";

        assert.equal(await verifySessionToken(token), null);

        process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";
});

test("token expirado e rejeitado", async () => {
        // assina com exp no passado usando a mesma chave
        const { SignJWT } = await import("jose");
        const key = new TextEncoder().encode(process.env.JWT_SECRET);
        const expirado = await new SignJWT({ email: "a@b.com" })
                .setProtectedHeader({ alg: "HS256" })
                .setSubject("u-1")
                .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
                .sign(key);

        assert.equal(await verifySessionToken(expirado), null);
});

test("lixo no lugar do token e rejeitado", async () => {
        assert.equal(await verifySessionToken("nao-e-um-jwt"), null);
});

test("segredo curto ou ausente falha alto, e nao como anonimo", async () => {
        const anterior = process.env.JWT_SECRET;
        process.env.JWT_SECRET = "curto";

        await assert.rejects(() => signSessionToken({ userId: "u", email: "a@b.com" }), /JWT_SECRET/);
        await assert.rejects(() => verifySessionToken("x.y.z"), /JWT_SECRET/);

        delete process.env.JWT_SECRET;
        await assert.rejects(() => signSessionToken({ userId: "u", email: "a@b.com" }), /JWT_SECRET/);

        process.env.JWT_SECRET = anterior;
});

test("o cookie de sessao tem os atributos de seguranca", () => {
        const cookie = sessionCookie("abc");

        assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=abc;`));
        assert.match(cookie, /HttpOnly/);
        assert.match(cookie, /Path=\//);
        assert.match(cookie, /SameSite=Lax/);
        assert.match(cookie, new RegExp(`Max-Age=${SESSION_MAX_AGE_SECONDS}`));
});

test("Secure so aparece em producao", () => {
        const anterior = process.env.NODE_ENV;

        process.env.NODE_ENV = "development";
        assert.doesNotMatch(sessionCookie("abc"), /Secure/);

        process.env.NODE_ENV = "production";
        assert.match(sessionCookie("abc"), /Secure/);

        process.env.NODE_ENV = anterior;
});

test("limpar o cookie zera o Max-Age", () => {
        assert.match(clearedSessionCookie(), /Max-Age=0/);
        assert.doesNotMatch(clearedSessionCookie(), /abc/);
});

test("grava o cookie de sessao sem apagar os outros", () => {
        const response = new Response("{}", { headers: { "set-cookie": "outro=1" } });
        withSessionCookie(response, "abc");

        const cookies = response.headers.getSetCookie();
        assert.deepEqual(cookies.length, 2);
        assert.match(cookies[0], /^outro=1$/);
        assert.match(cookies[1], new RegExp(`^${SESSION_COOKIE}=abc;`));
});

test("limpar a sessao nao apaga os outros cookies", () => {
        const response = new Response("{}", { headers: { "set-cookie": "outro=1" } });
        withoutSessionCookie(response);

        const cookies = response.headers.getSetCookie();
        assert.deepEqual(cookies.length, 2);
        assert.match(cookies[0], /^outro=1$/);
        assert.match(cookies[1], /Max-Age=0/);
});

test("le o cookie da requisicao", () => {
        const request = new Request("http://x/", {
                headers: { cookie: `outro=1; ${SESSION_COOKIE}=meu-token; mais=2` },
        });

        assert.equal(readSessionCookie(request), "meu-token");
});

test("cookie ausente ou vazio vira null", () => {
        assert.equal(readSessionCookie(new Request("http://x/")), null);
        assert.equal(readSessionCookie(new Request("http://x/", { headers: { cookie: "outro=1" } })), null);
        assert.equal(readSessionCookie(new Request("http://x/", { headers: { cookie: `${SESSION_COOKIE}=` } })), null);
});

test("cookie com valor codificado e decodificado", () => {
        const request = new Request("http://x/", {
                headers: { cookie: `${SESSION_COOKIE}=a%20b` },
        });

        assert.equal(readSessionCookie(request), "a b");
});
