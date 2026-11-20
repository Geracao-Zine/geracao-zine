import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const raiz = fileURLToPath(new URL("..", import.meta.url));

const { formatIsoDate, isIsoDate, coverFromParams, isCoverComplete } = await import(
	"../src/domain/index.ts"
);

function ler(rel) {
	return readFileSync(join(raiz, rel), "utf8");
}

test("formatIsoDate devolve o padrao brasileiro", () => {
	assert.equal(formatIsoDate("2026-03-15"), "15/03/2026");
	assert.equal(formatIsoDate("2026-12-01"), "01/12/2026");
});

test("formatIsoDate nao volta um dia em fuso negativo", () => {
	// TZ precisa estar definido antes do processo iniciar: mexer em
	// process.env.TZ aqui dentro nao muda o fuso que o Node ja adotou.
	const script = [
		`const { formatIsoDate } = await import(${JSON.stringify(new URL("../src/domain/date.ts", import.meta.url).href)});`,
		`console.log(formatIsoDate("2026-03-15"), formatIsoDate("2026-01-01"));`,
	].join("\n");

	for (const fuso of ["America/Sao_Paulo", "America/New_York", "UTC", "Asia/Tokyo"]) {
		const saida = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
			env: { ...process.env, TZ: fuso },
			encoding: "utf8",
		}).trim();

		assert.equal(saida, "15/03/2026 01/01/2026", `fuso ${fuso} deslocou a data`);
	}
});

test("formatIsoDate devolve vazio para data ausente ou invalida", () => {
	assert.equal(formatIsoDate(""), "");
	assert.equal(formatIsoDate("15/03/2026"), "");
	assert.equal(formatIsoDate("2026-13-01"), "");
	assert.equal(formatIsoDate("2026-02-30"), "");
	assert.equal(formatIsoDate("abc"), "");
});

test("isIsoDate aceita data real e recusa data impossivel", () => {
	assert.equal(isIsoDate("2026-03-15"), true);
	assert.equal(isIsoDate("2024-02-29"), true);
	assert.equal(isIsoDate("2026-02-29"), false);
	assert.equal(isIsoDate("2026-00-10"), false);
	assert.equal(isIsoDate("2026-12-32"), false);
});

test("coverFromParams le a data da URL", () => {
	const params = new Map([
		["coverTitle", "Zine"],
		["authorName", "Steve"],
		["date", "2026-03-15"],
	]);

	const cover = coverFromParams({ get: (k) => params.get(k) ?? null });

	assert.equal(cover.date, "2026-03-15");
});

test("coverFromParams ignora data ausente ou invalida", () => {
	const semData = coverFromParams({ get: () => null });
	assert.equal(semData.date, "");

	const invalida = coverFromParams({
		get: (k) => (k === "date" ? "2026-02-30" : null),
	});
	assert.equal(invalida.date, "");
});

test("a data nao entra no criterio de capa completa", () => {
	const base = { title: "Zine", author: "Steve", titleFont: "geistMono", authorFont: "geistSans" };

	assert.equal(isCoverComplete({ ...base, date: "" }), true);
	assert.equal(isCoverComplete({ ...base, date: "2026-03-15" }), true);
});

test("o cadastro oferece o campo de data como opcional", () => {
	const fonte = ler("src/components/ZineWizard/steps/CoverStep.tsx");

	assert.ok(fonte.includes('type="date"'), "falta o campo de data");
	assert.ok(fonte.includes("(opcional)"), "o campo deve se anunciar como opcional");
});

test("a data vazia nao renderiza a linha na capa", () => {
	const fonte = ler("src/components/CoverCard/index.tsx");

	assert.ok(
		/formattedDate\s*\?/.test(fonte),
		"a capa deve condicionar a linha da data a existir data",
	);
});

test("o PDF so desenha a data quando ela existe", () => {
	const fonte = ler("src/lib/pdf/reading.ts");

	assert.ok(/const temData = Boolean\(input\.date\)/.test(fonte));
	assert.ok(/if \(temData\) \{/.test(fonte), "o desenho da data deve ser condicional");
});
