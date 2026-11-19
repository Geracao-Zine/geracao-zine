import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const read = (name) => readFileSync(fileURLToPath(new URL(name, root)), "utf8");

const nvmrc = read(".nvmrc").trim();
const pkg = JSON.parse(read("package.json"));
const readme = read("README.md");

test(".nvmrc fixes the Node 24 runtime", () => {
        assert.equal(nvmrc, "24");
});

test("package.json declares the supported Node range", () => {
        assert.equal(pkg.engines?.node, ">=22");
});

test("@types/node tracks the pinned runtime major", () => {
        assert.match(pkg.devDependencies["@types/node"], /^\^24$/);
});

test("README documents the required Node version", () => {
        assert.match(readme, /Node\.js 24/);
        assert.match(readme, /\.nvmrc/);
});
