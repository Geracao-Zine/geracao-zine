export default function SupportPage() {
  return (
    <main className="min-h-screen pt-[var(--navbar-height)] bg-[var(--background)] text-[var(--foreground)]">
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">

        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          Apoie o <span className="text-[var(--orange)]">Geração Zine</span>
        </h1>

        <p className="text-lg text-zinc-600 max-w-2xl mx-auto mb-12">
          Seu apoio mantém a plataforma independente, aberta e acessível
          para novos criadores.
        </p>

        <div className="bg-white rounded-2xl shadow-lg p-10 border border-zinc-200">
          
          <h2 className="text-xl font-semibold mb-4">
            Seja um apoiador
          </h2>

          <button className="px-8 py-3 rounded-full bg-[var(--purple-dark)] text-white font-semibold hover:opacity-90 transition">
            Quero apoiar
          </button>

        </div>

      </section>
    </main>
  );
}