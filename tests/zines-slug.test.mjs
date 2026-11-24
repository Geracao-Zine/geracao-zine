import assert from "node:assert/strict";
import { test } from "node:test";

process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres!!";

const { slugify, slugWithSuffix, SLUG_MAX_LENGTH, SLUG_FALLBACK } = await import("../src/lib/zines/slug.ts");

test("slugify tira acento, caixa e pontuacao", () => {
        assert.equal(slugify("Meu Zine Incrível"), "meu-zine-incrivel");
        assert.equal(slugify("Poesias de 2026!"), "poesias-de-2026");
        assert.equal(slugify("  espaços   demais  "), "espacos-demais");
});

test("slugify colapsa pontuacao em um hifen so", () => {
        assert.equal(slugify("A / B -- C"), "a-b-c");
});

test("slugify devolve vazio quando nao ha caractere aproveitavel", () => {
        assert.equal(slugify("!!!"), "");
        assert.equal(slugify("   "), "");
});

test("slugify respeita o limite de tamanho e nao termina com hifen", () => {
        const slug = slugify("a".repeat(SLUG_MAX_LENGTH + 40));

        assert.ok(slug.length <= SLUG_MAX_LENGTH, `slug com ${slug.length} caracteres`);
        assert.ok(!slug.endsWith("-"));
});

test("slugWithSuffix desempata com um sufixo estavel vindo do id", () => {
        const id = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
        const slug = slugWithSuffix("meu-zine", id);

        assert.equal(slug, "meu-zine-3f2504e0");
        assert.equal(slug, slugWithSuffix("meu-zine", id));
});

test("slugWithSuffix usa o fallback quando a base e vazia", () => {
        const id = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

        assert.ok(slugWithSuffix("", id).startsWith(`${SLUG_FALLBACK}-`));
});

test("slugWithSuffix nao passa do limite mesmo com base longa", () => {
        const id = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
        const slug = slugWithSuffix("b".repeat(SLUG_MAX_LENGTH * 2), id);

        assert.ok(slug.length <= SLUG_MAX_LENGTH, `slug com ${slug.length} caracteres`);
        assert.ok(slug.endsWith("-3f2504e0"));
});
