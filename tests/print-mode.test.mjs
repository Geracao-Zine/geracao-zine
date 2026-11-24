import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));

function ler(rel) {
        return readFileSync(join(raiz, rel), "utf8");
}

const {
        DEFAULT_PRINT_MODE,
        PRINT_MODES,
        createDraft,
        isPrintMode,
        parseDraft,
        printModeFrom,
        printModeOption,
        serializeDraft,
} = await import("../src/domain/index.ts");

test("o modo padrao e so frente e o invalido cai nele", () => {
        assert.equal(DEFAULT_PRINT_MODE, "simplex");
        assert.deepEqual(
                PRINT_MODES.map((option) => option.id),
                ["simplex", "duplex"]
        );

        for (const invalido of [undefined, null, "", "frente-verso", 42, {}, []]) {
                assert.equal(printModeFrom(invalido), "simplex");
        }
});

test("so os dois modos conhecidos sao aceitos", () => {
        assert.equal(isPrintMode("simplex"), true);
        assert.equal(isPrintMode("duplex"), true);
        assert.equal(isPrintMode("duplexo"), false);
        assert.equal(isPrintMode(undefined), false);
});

test("cada modo tem rotulo e descricao para o seletor", () => {
        for (const modo of PRINT_MODES) {
                assert.ok(modo.label.length > 0, `${modo.id} sem rotulo`);
                assert.ok(modo.description.length > 0, `${modo.id} sem descricao`);
                assert.equal(printModeOption(modo.id)?.label, modo.label);
        }

        assert.equal(printModeOption("inexistente"), undefined);
});

test("o rascunho novo nasce em so frente", () => {
        assert.equal(createDraft().printMode, "simplex");
});

test("o rascunho guarda o modo de impressao escolhido", () => {
        const rascunho = { ...createDraft(), printMode: "duplex" };
        const voltou = parseDraft(serializeDraft(rascunho));

        assert.equal(voltou.printMode, "duplex");
});

test("rascunho antigo, sem o campo, cai em so frente", () => {
        const antigo = JSON.parse(serializeDraft(createDraft()));
        delete antigo.printMode;

        assert.equal(parseDraft(JSON.stringify(antigo)).printMode, "simplex");
});

test("modo desconhecido no rascunho salvo nao derruba a leitura", () => {
        const adulterado = JSON.parse(serializeDraft(createDraft()));
        adulterado.printMode = "frente-verso";

        const voltou = parseDraft(JSON.stringify(adulterado));

        assert.equal(voltou.printMode, "simplex");
        assert.equal(voltou.format, createDraft().format, "o resto do rascunho sobrevive");
});

test("o seletor de lado de impressao aparece na etapa de dobra", () => {
        assert.match(ler("src/components/ZineWizard/steps/PrintStep.tsx"), /PrintModeSelector/);
        assert.match(ler("src/components/ZineWizard/index.tsx"), /onPrintModeChange=/);
        assert.match(ler("src/hooks/useZineEditor.ts"), /printMode/);
});

test("o seletor desenha os dois modos e marca o escolhido", () => {
        const fonte = ler("src/components/PrintModeSelector/index.tsx");

        assert.match(fonte, /PRINT_MODES\.map/, "o seletor deve listar os modos do dominio");
        assert.match(fonte, /aria-pressed=\{selected\}/, "o modo atual precisa ficar acessivel");
});

const { forcedPrintMode } = await import("../src/lib/pdf/imposition.ts");
const { TEMPLATES } = await import("../src/lib/pdf/templates.ts");

test("cada dobra declara o modo que a imposicao obriga", () => {
        assert.equal(forcedPrintMode(TEMPLATES["banner-a4"]), null);
        assert.equal(forcedPrintMode(TEMPLATES["trifold"]), "duplex");
        assert.equal(forcedPrintMode(TEMPLATES["saddle-stitch"]), "duplex");
        assert.equal(forcedPrintMode(TEMPLATES["folio-unico"]), "duplex");
        assert.equal(forcedPrintMode(TEMPLATES["mini-zine"]), "simplex");
        assert.equal(forcedPrintMode(TEMPLATES["mini-zine-16"]), "simplex");
});

test("o seletor trava quando a dobra obriga um modo", () => {
        const seletor = ler("src/components/PrintModeSelector/index.tsx");
        assert.match(seletor, /locked = false/);
        assert.match(seletor, /disabled=\{locked\}/);
        assert.match(seletor, /O PDF já sai assim/);

        const passo = ler("src/components/ZineWizard/steps/PrintStep.tsx");
        assert.match(passo, /printModeLocked/);
        assert.match(passo, /locked=\{printModeLocked\}/);

        const wizard = ler("src/components/ZineWizard/index.tsx");
        assert.match(wizard, /printModeLocked=\{editor\.printModeLocked\}/);

        const hook = ler("src/hooks/useZineEditor.ts");
        assert.match(hook, /forcedPrintMode/);
        assert.match(hook, /printModeLocked/);
});
