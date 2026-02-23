"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditorPage() {
  const searchParams = useSearchParams();
  const template = searchParams.get("template");

  const [templateUrl, setTemplateUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!template) return;

    // Segurança básica: evita carregar qualquer coisa fora do esperado
    const allowedTemplates = ["minimal", "editorial", "experimental"];

    if (allowedTemplates.includes(template)) {
      setTemplateUrl(`/templates/${template}.html`);
    }
  }, [template]);

  if (!templateUrl) {
    return (
      <main className="min-h-screen pt-[var(--navbar-height)] flex items-center justify-center bg-[var(--background)]">
        <p className="text-zinc-500">
          Template inválido ou não selecionado.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-[var(--navbar-height)] bg-zinc-100">
      
      {/* Toolbar */}
      <div className="w-full px-6 py-4 bg-white border-b flex items-center justify-between">
        <h1 className="font-semibold">
          Editor - {template}
        </h1>

        <div className="flex gap-4">
          <button className="px-4 py-2 rounded-full bg-zinc-200 hover:bg-zinc-300 transition">
            Salvar
          </button>

          <button className="px-4 py-2 rounded-full bg-[var(--purple-dark)] text-white hover:opacity-90 transition">
            Publicar
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex justify-center py-10">
        <div className="w-[79px] h-[113px] bg-white shadow-2xl overflow-hidden">
          <iframe
            src={templateUrl}
            className="w-full h-full"
          />
        </div>
      </div>

    </main>
  );
}