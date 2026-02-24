"use client";

export default function EditorPage() {

  return (
    <main className="min-h-screen pt-[var(--navbar-height)] bg-zinc-100">
      
      {/* Toolbar */}
      <div className="w-full px-6 py-4 bg-white border-b flex items-center justify-between">
        <h1 className="font-semibold">
          Editor - Geração Zine
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

     

    </main>
  );
}