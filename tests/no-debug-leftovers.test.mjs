import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC_DIR = fileURLToPath(new URL("../src/", import.meta.url));

function sourceFiles(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const fullPath = join(dir, entry.name);
		return entry.isDirectory() ? sourceFiles(fullPath) : [fullPath];
	});
}

const files = sourceFiles(SRC_DIR);

function sourceOf(suffix) {
	const match = files.find((file) => file.endsWith(suffix));
	assert.ok(match, `expected to find ${suffix}`);
	return readFileSync(match, "utf8");
}

	// O ponto unico de log do servidor. A regra continua valendo para todo o resto
	// de src/: e o que impede depuracao esquecida de voltar.
	const LOG_MODULE = "lib/log.ts";

	test("no console.* calls remain in src/", () => {
		const offenders = files
			.filter((file) => !file.endsWith(LOG_MODULE))
			.filter((file) => /\bconsole\.\w+\(/.test(readFileSync(file, "utf8")))
			.map((file) => file.slice(SRC_DIR.length));

		assert.deepEqual(offenders, []);
	});

	test("o modulo de log concentra as chamadas de console", () => {
		assert.match(sourceOf(LOG_MODULE), /console\.error\(/);
	});

test("Editor page imports only the pdf-lib symbols it uses", () => {
	const source = sourceOf("app/Editor/page.tsx");

	for (const unused of [
		"concatTransformationMatrix",
		"pushGraphicsState",
		"popGraphicsState",
	]) {
		assert.ok(
			!source.includes(unused),
			`${unused} should not be imported or referenced`
		);
	}
});

test("Create page no longer uses useEffect", () => {
	const source = sourceOf("app/Create/page.tsx");

	assert.ok(!source.includes("useEffect"), "useEffect should be removed");
});
