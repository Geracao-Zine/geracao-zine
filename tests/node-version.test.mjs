import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const read = (name) => readFileSync(fileURLToPath(new URL(name, root)), "utf8");

const nvmrc = read(".nvmrc").trim();
const pkg = JSON.parse(read("package.json"));
const readme = read("README.md");

test(".nvmrc fixes the Node 26 runtime", () => {
        assert.equal(nvmrc, "26");
});

test("package.json pins the same major as .nvmrc", () => {
        assert.equal(pkg.engines?.node, `${nvmrc}.x`);
});

test("@types/node tracks the pinned runtime major", () => {
        assert.match(pkg.devDependencies["@types/node"], /^\^26$/);
});

test("README documents the required Node version", () => {
        assert.match(readme, /Node\.js 26/);
        assert.match(readme, /\.nvmrc/);
});
