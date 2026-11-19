import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const navbarPath = fileURLToPath(
        new URL("../src/components/Navbar/index.tsx", import.meta.url),
);
const source = readFileSync(navbarPath, "utf8");

const classes = [...source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)]
        .flatMap((match) => (match[1] ?? match[2] ?? "").split(/\s+/))
        .filter(Boolean);

const invalidClasses = [
        "bg-neutro-50",
        "dark:bg-neutro-950",
        "border-neutro-100",
        "dark:border-neutro-800",
        "text-escuro",
        "dark:text-neutro-100",
        "bg-zinc",
        "hover:text-laranja",
];

test("navbar does not use Tailwind classes that do not exist", () => {
        for (const invalid of invalidClasses) {
                assert.ok(
                        !classes.includes(invalid),
                        `classe invalida encontrada: ${invalid}`,
                );
        }
});

test("navbar header has background, border and foreground colors", () => {
        assert.ok(classes.includes("bg-[var(--background)]"));
        assert.ok(classes.includes("text-[var(--foreground)]"));
        assert.ok(classes.includes("border-b"));
        assert.ok(classes.includes("border-zinc-300"));
        assert.ok(classes.includes("dark:border-zinc-700"));
});
