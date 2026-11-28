import assert from "node:assert/strict";
import { test } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";

const { newZineFrom, zinePatchFrom, ZINE_TITLE_MAX_LENGTH } = await import("../src/lib/zines/input.ts");
const { ZineError } = await import("../src/lib/zines/errors.ts");

function erroDe(fn) {
        try {
                fn();
        } catch (error) {
                assert.ok(error instanceof ZineError, `esperava ZineError, veio ${error}`);
                return error;
        }

        assert.fail("esperava erro, nao houve");
}

const CONTEUDO = { version: 1, cover: { title: "Zine" } };

test("newZineFrom le os campos e nasce divulgado por padrao", () => {
        const zine = newZineFrom({ title: "  Meu Zine  ", content: CONTEUDO, contentVersion: 1 });

        assert.equal(zine.title, "Meu Zine");
        assert.deepEqual(zine.content, CONTEUDO);
        assert.equal(zine.contentVersion, 1);
        assert.equal(zine.visibility, "public", "criar ja divulga; privar e escolha explicita");
});

test("newZineFrom respeita o privado quando o autor escolhe", () => {
        const zine = newZineFrom({ title: "Zine", content: CONTEUDO, contentVersion: 1, visibility: "private" });

        assert.equal(zine.visibility, "private");
});

test("newZineFrom ignora ownerId vindo do corpo", () => {
        const zine = newZineFrom({
                title: "Zine",
                content: CONTEUDO,
                contentVersion: 1,
                ownerId: "00000000-0000-0000-0000-000000000000",
        });

        assert.equal("ownerId" in zine, false);
});

test("newZineFrom aceita visibilidade publica explicita", () => {
        const zine = newZineFrom({ title: "Zine", content: CONTEUDO, contentVersion: 1, visibility: "public" });

        assert.equal(zine.visibility, "public");
});

test("newZineFrom recusa titulo ausente, vazio ou nao-texto", () => {
        for (const title of [undefined, "", "   ", 42, null, {}]) {
                const erro = erroDe(() => newZineFrom({ title, content: CONTEUDO, contentVersion: 1 }));

                assert.ok(["titulo_invalido", "titulo_ausente"].includes(erro.code), erro.code);
                assert.equal(erro.status, 400);
        }
});

test("newZineFrom recusa titulo acima do limite", () => {
        const erro = erroDe(() =>
                newZineFrom({ title: "a".repeat(ZINE_TITLE_MAX_LENGTH + 1), content: CONTEUDO, contentVersion: 1 })
        );

        assert.equal(erro.code, "titulo_longo");
});

test("newZineFrom recusa conteudo ausente ou nao-JSON", () => {
        for (const content of [undefined, () => {}, Symbol("x")]) {
                const erro = erroDe(() => newZineFrom({ title: "Zine", content, contentVersion: 1 }));

                assert.ok(["conteudo_ausente", "conteudo_invalido"].includes(erro.code), erro.code);
        }
});

test("newZineFrom recusa contentVersion ausente ou nao-inteiro positivo", () => {
        for (const contentVersion of [undefined, 0, -1, 1.5, "1"]) {
                const erro = erroDe(() => newZineFrom({ title: "Zine", content: CONTEUDO, contentVersion }));

                assert.ok(["versao_ausente", "versao_invalida"].includes(erro.code), erro.code);
        }
});

test("newZineFrom recusa visibilidade desconhecida", () => {
        const erro = erroDe(() =>
                newZineFrom({ title: "Zine", content: CONTEUDO, contentVersion: 1, visibility: "unlisted" })
        );

        assert.equal(erro.code, "visibilidade_invalida");
});

test("newZineFrom recusa corpo que nao e objeto", () => {
        for (const body of [null, [], "texto", 42]) {
                const erro = erroDe(() => newZineFrom(body));

                assert.equal(erro.code, "corpo_invalido");
        }
});

test("zinePatchFrom devolve so os campos presentes", () => {
        assert.deepEqual(zinePatchFrom({ title: "Novo" }), { title: "Novo" });
        assert.deepEqual(zinePatchFrom({}), {});
});

test("zinePatchFrom valida cada campo presente igual ao create", () => {
        assert.equal(erroDe(() => zinePatchFrom({ title: "" })).code, "titulo_ausente");
        assert.equal(erroDe(() => zinePatchFrom({ contentVersion: 0 })).code, "versao_invalida");
        assert.equal(erroDe(() => zinePatchFrom({ visibility: "x" })).code, "visibilidade_invalida");
        assert.equal(erroDe(() => zinePatchFrom({ content: () => {} })).code, "conteudo_invalido");
});

test("zinePatchFrom ignora ownerId e campos desconhecidos", () => {
        const patch = zinePatchFrom({ ownerId: "00000000-0000-0000-0000-000000000000", id: "x", title: "T" });

        assert.deepEqual(patch, { title: "T" });
});
