"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const router = useRouter();

  const fontes = [
    { id: "font-sans", name: "Geist Sans" },
    { id: "font-mono", name: "Geist Mono" },
  ];

  const paginas = [4, 8, 12, 16];

  const [pages, setPages] = useState<number | null>(null);
  const [coverTitle, setCoverTitle] = useState("");
  const [titleFont, setTitleFont] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorFont, setAuthorFont] = useState("");
  const [dateType, setDateType] = useState<"year" | "full">("year");

  const handleContinue = () => {
    if (!pages || !coverTitle || !authorName) return;

    const params = new URLSearchParams({
      pages: String(pages),
      coverTitle,
      titleFont,
      authorName,
      authorFont,
      dateType,
    });

    router.push(`/editor?${params.toString()}`);
  };

  const isValid =
    pages && coverTitle && authorName && titleFont && authorFont;

  return (
    <main className="min-h-screen pt-[var(--navbar-height)] bg-[var(--background)] text-[var(--foreground)]">
      <section className="max-w-3xl mx-auto px-6 py-20 space-y-12">

        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            Configure seu <span className="text-[var(--purple-dark)]">Zine</span>
          </h1>
          <p className="text-zinc-600">
            Defina a estrutura inicial da sua publicação.
          </p>
        </div>

        {/* PÁGINAS */}
        <div className="space-y-2">
          <label className="font-semibold">Quantidade de páginas</label>
          <select
            className="w-full border rounded-lg p-3"
            onChange={(e) => setPages(Number(e.target.value))}
          >
            <option value="">Selecione</option>
            {paginas.map((p) => (
              <option key={p} value={p}>
                {p} páginas
              </option>
            ))}
          </select>
        </div>

        {/* TÍTULO */}
        <div className="space-y-2">
          <label className="font-semibold">Título da capa</label>
          <input
            type="text"
            className="w-full border rounded-lg p-3"
            placeholder="Digite o título"
            value={coverTitle}
            onChange={(e) => setCoverTitle(e.target.value)}
          />

          <select
            className="w-full border rounded-lg p-3"
            onChange={(e) => setTitleFont(e.target.value)}
          >
            <option value="">Fonte do título</option>
            {fontes.map((fonte) => (
              <option key={fonte.id} value={fonte.id}>
                {fonte.name}
              </option>
            ))}
          </select>
        </div>

        {/* AUTOR */}
        <div className="space-y-2">
          <label className="font-semibold">Nome do autor(a)</label>
          <input
            type="text"
            className="w-full border rounded-lg p-3"
            placeholder="Digite o nome"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />

          <select
            className="w-full border rounded-lg p-3"
            onChange={(e) => setAuthorFont(e.target.value)}
          >
            <option value="">Fonte do autor</option>
            {fontes.map((fonte) => (
              <option key={fonte.id} value={fonte.id}>
                {fonte.name}
              </option>
            ))}
          </select>
        </div>

        {/* DATA */}
        <div className="space-y-2">
          <label className="font-semibold">Data</label>
          <select
            className="w-full border rounded-lg p-3"
            onChange={(e) =>
              setDateType(e.target.value as "year" | "full")
            }
          >
            <option value="year">Apenas o ano</option>
            <option value="full">Data completa</option>
          </select>
        </div>

        {/* BOTÃO */}
        <div className="text-center pt-8">
          <button
            onClick={handleContinue}
            disabled={!isValid}
            className={`px-10 py-3 rounded-full font-semibold transition ${
              isValid
                ? "bg-[var(--purple-dark)] text-white hover:opacity-90"
                : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
            }`}
          >
            Continuar
          </button>
        </div>

      </section>
    </main>
  );
}