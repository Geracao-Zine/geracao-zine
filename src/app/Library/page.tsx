export default function LibraryPage() {
  return (
    <main className="min-h-screen pt-[var(--navbar-height)] bg-[var(--background)] text-[var(--foreground)]">
      <section className="max-w-6xl mx-auto px-6 py-20">

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Biblioteca de <span className="text-[var(--purple)]">Zines</span>
          </h1>
          <p className="text-zinc-600">
            Descubra criações independentes da comunidade.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          
          {[1,2,3,4,5,6].map((item) => (
            <div
              key={item}
              className="bg-white rounded-2xl p-6 shadow-md border border-zinc-200 hover:shadow-xl transition"
            >
              <div className="h-40 bg-zinc-200 rounded-lg mb-4" />
              <h3 className="font-semibold mb-2">Zine #{item}</h3>
              <p className="text-sm text-zinc-500">
                Breve descrição do zine publicado.
              </p>
            </div>
          ))}

        </div>

      </section>
    </main>
  );
}