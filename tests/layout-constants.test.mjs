import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const raiz = new URL("../", import.meta.url).pathname;
const ler = (rel) => readFile(`${raiz}${rel}`, "utf8");

test("layout declara A4 retrato e paisagem com a origem documentada", async () => {
  const ts = await ler("src/lib/pdf/layout.ts");
  assert.match(ts, /A4_PORTRAIT = \{ width: 595, height: 842 \}/);
  assert.match(ts, /A4_LANDSCAPE = \{/);
  assert.match(ts, /width: A4_PORTRAIT\.height/);
  assert.match(ts, /height: A4_PORTRAIT\.width/);
  assert.match(ts, /210 x 297 mm/);
});

// A regra vale para literais numericos de medida, nao para numeros que
// aparecem em texto: comentario, docstring e id de formato nao sao diagramacao.
const semTexto = (ts) =>
  ts
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");

for (const arquivo of ["zine.ts", "panel.ts", "imposition.ts", "templates.ts"]) {
  test(`${arquivo} nao tem numero magico de diagramacao`, async () => {
    const ts = await ler(`src/lib/pdf/${arquivo}`);
    const corpo = semTexto(ts).replace(
      /from "\.\/layout\.ts"[\s\S]*?\} from "\.\/layout\.ts";/,
      ""
    );
    const proibidos = [
      /\b595\b/, /\b842\b/, /\b70\b/,
      /\b(10|11|13|14|16|20|22|24|26|30|38|40|60)\b/,
      /\b0\.(15|5|6|75)\b/,
    ];
    for (const p of proibidos) {
      assert.doesNotMatch(corpo, p, `numero magico ${p} sobrou em ${arquivo}`);
    }
  });
}

test("constantes de capa e poema ficam no modulo de layout", async () => {
  const ts = await ler("src/lib/pdf/layout.ts");
  for (const nome of [
    "COVER_TITLE_SIZE",
    "COVER_TITLE_LINE_HEIGHT",
    "COVER_AUTHOR_SIZE",
    "COVER_DATE_SIZE",
    "COVER_GAP_TITLE_TO_AUTHOR",
    "COVER_GAP_AUTHOR_TO_DATE",
    "COVER_DIVIDER_WIDTH",
    "POEM_TITLE_SIZE",
    "POEM_SUBTITLE_SIZE",
    "POEM_DATE_SIZE",
    "POEM_BODY_SIZE",
    "POEM_LINE_HEIGHT",
    "PANEL_HEIGHT",
    "PAGE_MARGIN",
    "PANEL_GUTTER",
  ]) {
    assert.match(ts, new RegExp(`export const ${nome} =`), `falta ${nome}`);
  }
});

test("A4 tem uma unica definicao no codigo", async () => {
  const layout = await ler("src/lib/pdf/layout.ts");
  const types = await ler("src/lib/pdf/types.ts");
  assert.match(layout, /width: 595/);
  assert.doesNotMatch(types, /width: 595/);
  assert.match(types, /export \{ A4, A4_CONTENT_WIDTH \} from "\.\/layout\.ts";/);
});
