import Image from "next/image";
import logo from "@/assets/GeraçãoZine.png";

export default function HomePage() {
	return (
		<main className="min-h-screen pt-[var(--navbar-height)] bg-[var(--background)] text-[var(--foreground)]">

			{/* HERO */}
			<section className="min-h-screen max-w-6xl mx-auto text-center">

				<div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center mb-8">
					{/* LOGO */}
					<div className="flex justify-center w-full">
						<Image
							src={logo}
							alt="Geração Zine"
							width={300}
							height={300}
							className="drop-shadow-md max-w-[30%] md:max-w-full"
							priority
						/>
					</div>

					<h1 className="text-5xl md:text-6xl font-bold leading-tight ">
						Publique suas ideias.<br />
						<span className="text-[var(--purple-dark)]">
							Crie seu próprio Zine.
						</span>
					</h1>
				</div>

				<p className="text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto mb-12">
					O Geração Zine é uma plataforma para criadores independentes
					transformarem pensamentos, arte e narrativas em publicações autorais.
				</p>

				<div className="flex flex-col sm:flex-row justify-center gap-6">
					<a
						href="/Create"
						className="px-8 py-3 rounded-full bg-[var(--purple-dark)] text-white font-semibold hover:opacity-90 transition"
					>
						Criar meu Zine
					</a>

					<a
						href="/Library"
						className="px-8 py-3 rounded-full border border-zinc-300 hover:bg-white transition"
					>
						Explorar Biblioteca
					</a>
				</div>

			</section>

			{/* CONCEITO */}
			<section className="bg-white py-24">
				<div className="max-w-5xl mx-auto px-6 text-center">

					<h2 className="text-3xl text-zinc-600 md:text-4xl font-bold mb-8">
						O que é um Zine?
					</h2>

					<p className="text-lg text-zinc-600 leading-relaxed max-w-3xl mx-auto">
						Zines são publicações independentes, criadas fora dos meios tradicionais.
						São espaços de expressão livre — onde ideias, arte, cultura e opinião
						ganham forma sem filtros ou intermediários.
					</p>

				</div>
			</section>

			{/* COMO FUNCIONA */}
			<section className="py-24">
				<div className="max-w-6xl mx-auto px-6">

					<div className="text-center mb-16">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">
							Simples. Direto. Autoral.
						</h2>
						<p className="text-zinc-600">
							Em poucos passos você publica sua própria edição.
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-12 text-center">

						<div>
							<div className="w-14 h-14 mx-auto mb-6 rounded-full bg-[var(--purple)] text-white flex items-center justify-center font-bold text-lg">
								1
							</div>
							<h3 className="font-semibold text-lg mb-3">
								Escolha um modelo
							</h3>
							<p className="text-zinc-600 text-sm">
								Comece com um template e personalize o visual.
							</p>
						</div>

						<div>
							<div className="w-14 h-14 mx-auto mb-6 rounded-full bg-[var(--purple)] text-white flex items-center justify-center font-bold text-lg">
								2
							</div>
							<h3 className="font-semibold text-lg mb-3">
								Edite e crie
							</h3>
							<p className="text-zinc-600 text-sm">
								Adicione textos. Dê vida às suas ideias.
							</p>
						</div>

						<div>
							<div className="w-14 h-14 mx-auto mb-6 rounded-full bg-[var(--purple)] text-white flex items-center justify-center font-bold text-lg">
								3
							</div>
							<h3 className="font-semibold text-lg mb-3">
								Publique e compartilhe
							</h3>
							<p className="text-zinc-600 text-sm">
								Disponibilize sua edição para a comunidade.
							</p>
						</div>

					</div>

				</div>
			</section>

			{/* CTA FINAL */}
			<section className="bg-[var(--purple-dark)] py-24 text-white text-center">
				<div className="max-w-4xl mx-auto px-6">

					<h2 className="text-3xl md:text-4xl font-bold mb-6">
						Sua voz merece ser publicada.
					</h2>

					<p className="text-lg mb-10 text-purple-100">
						Comece agora e transforme sua ideia em uma edição independente.
					</p>

					<a
						href="/Create"
						className="px-10 py-4 rounded-full bg-white text-[var(--purple-dark)] font-semibold hover:opacity-90 transition"
					>
						Criar meu primeiro Zine
					</a>

				</div>
			</section>

		</main>
	);
}