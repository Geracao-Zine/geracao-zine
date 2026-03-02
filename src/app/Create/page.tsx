"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FontSelector from "@/components/FontSelector";

export default function CreatePage() {
	const router = useRouter();

	const fontes = [
		{ id: "geistSans", label: "Geist Sans", className: "font-sans" },
		{ id: "geistMono", label: "Geist Mono", className: "font-mono" },
	];

	const paginas = [4, 8, 12, 16];

	const [pages, setPages] = useState<number>(8);
	const [coverTitle, setCoverTitle] = useState("");
	const [titleFont, setTitleFont] = useState("font-sans");
	const [authorName, setAuthorName] = useState("");
	const [authorFont, setAuthorFont] = useState("font-mono");
	const [date, setDate] = useState(new Date());

	useEffect(() => {
		console.log("autor", authorName, "titulo", coverTitle, "páginas", pages, "data", date, "fonte título", titleFont, "fonte autor", authorFont);
	}, [authorName, coverTitle, pages, date, titleFont, authorFont]);

	const handleContinue = () => {
		if (!pages || !coverTitle || !authorName) return;

		const params = new URLSearchParams({
			pages: String(pages),
			coverTitle,
			titleFont,
			authorName,
			authorFont,
			date: date.toISOString(),
		});

		router.push(`/Editor?${params.toString()}`);
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
					<label className="font-semibold">Quantidade de páginas (por folha A4)</label>
					<select
						value={pages ?? ""}
						onChange={(e) => setPages(Number(e.target.value))}
						className="
							w-full 
							bg-white dark:bg-zinc-900
							text-zinc-900 dark:text-zinc-100
							border border-zinc-300 dark:border-zinc-700
							rounded-xl 
							px-4 py-3
							focus:outline-none 
							focus:ring-2 
							focus:ring-[var(--purple-dark)]
							transition
						"
					>
						<option value="" className="text-zinc-400">
							Selecione
						</option>
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
						className="
							w-full
							bg-white dark:bg-zinc-900
							text-zinc-900 dark:text-zinc-100
							border border-zinc-300 dark:border-zinc-700
							rounded-xl
							px-4 py-3
							focus:outline-none
							focus:ring-2
							focus:ring-[var(--purple-dark)]
							transition
						"
						placeholder="Digite o título"
						value={coverTitle}
						onChange={(e) => setCoverTitle(e.target.value)}
					/>

					<FontSelector
						label="Fonte do título"
						value={titleFont}
						onChange={setTitleFont}
						options={fontes}
					/>
				</div>

				{/* AUTOR */}
				<div className="space-y-2">
					<label className="font-semibold">Nome do autor(a)</label>
					<input
						type="text"
						className="
							w-full
							bg-white dark:bg-zinc-900
							text-zinc-900 dark:text-zinc-100
							border border-zinc-300 dark:border-zinc-700
							rounded-xl
							px-4 py-3
							focus:outline-none
							focus:ring-2
							focus:ring-[var(--purple-dark)]
							transition
							"
						placeholder="Digite o nome"
						value={authorName}
						onChange={(e) => setAuthorName(e.target.value)}
					/>

					<FontSelector
						label="Fonte do autor"
						value={authorFont}
						onChange={setAuthorFont}
						options={fontes}
					/>

				</div>

				{/* DATA */}
				<div className="space-y-2">
					<label className="font-semibold">Data</label>
					<input
						type="date"
						className="
							w-full
							bg-white dark:bg-zinc-900
							text-zinc-900 dark:text-zinc-100
							border border-zinc-300 dark:border-zinc-700
							rounded-xl
							px-4 py-3
							focus:outline-none
							focus:ring-2
							focus:ring-[var(--purple-dark)]
							transition
						"
						onChange={(e) =>
							setDate(new Date(e.target.value))
						}
					/>
				</div>

				{/* BOTÃO */}
				<div className="text-center pt-8">
					<button
						onClick={handleContinue}
						disabled={!isValid}
						className={`px-10 py-3 cursor-pointer rounded-full font-semibold transition ${isValid
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