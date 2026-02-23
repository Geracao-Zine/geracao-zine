"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const templates = [
  {
    id: "minimal",
    title: "Minimal",
    description: "Layout limpo com foco no conteúdo.",
    file: "/templates/minimal.html",
  },
  {
    id: "editorial",
    title: "Editorial",
    description: "Estilo revista independente e tipografia forte.",
    file: "/templates/editorial.html",
  },
  {
    id: "experimental",
    title: "Experimental",
    description: "Layout ousado com composições criativas.",
    file: "/templates/experimental.html",
  },
];

export default function CreatePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    if (!selected) return;
    router.push(`/Editor?template=${selected}`);
  };

  return (
    <main className="min-h-screen pt-[var(--navbar-height)] bg-[var(--background)] text-[var(--foreground)]">
      <section className="max-w-6xl mx-auto px-6 py-20">

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Escolha um <span className="text-[var(--purple-dark)]">modelo</span>
          </h1>

          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            Comece com um template e personalize do seu jeito.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 mb-16">

          {templates.map((template) => {
            const isActive = selected === template.id;

            return (
              <button
                key={template.id}
                onClick={() => setSelected(template.id)}
                className={`
                  text-left p-6 rounded-2xl border transition-all duration-300
                  ${isActive 
                    ? "border-[var(--purple-dark)] bg-white shadow-xl scale-[1.02]" 
                    : "border-zinc-200 bg-white hover:shadow-lg"}
                `}
              >
                <div className="h-40 rounded-lg overflow-hidden border mb-6">
                  <iframe
                    src={template.file}
                    className="w-full h-full pointer-events-none scale-75 origin-top-left"
                  />
                </div>

                <h3 className="text-xl font-semibold mb-2">
                  {template.title}
                </h3>

                <p className="text-sm text-zinc-500">
                  {template.description}
                </p>
              </button>
            );
          })}

        </div>

        <div className="text-center">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className={`
              px-10 py-3 rounded-full font-semibold transition
              ${selected
                ? "bg-[var(--purple-dark)] text-white hover:opacity-90"
                : "bg-zinc-300 text-zinc-500 cursor-not-allowed"}
            `}
          >
            Continuar
          </button>
        </div>

      </section>
    </main>
  );
}