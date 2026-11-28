"use client";

import type { JSX } from "react";
import type { IconType } from "react-icons";
import { HiOutlineBookOpen, HiOutlineHeart, HiOutlineSquare2Stack } from "react-icons/hi2";

export type Aba = "biblioteca" | "meus" | "favoritos";

type Item = {
	aba: Aba;
	rotulo: string;
	icone: IconType;
};

const ITENS: Item[] = [
	{ aba: "biblioteca", rotulo: "Biblioteca", icone: HiOutlineBookOpen },
	{ aba: "meus", rotulo: "Meus zines", icone: HiOutlineSquare2Stack },
	{ aba: "favoritos", rotulo: "Favoritos", icone: HiOutlineHeart },
];

type Props = {
	aba: Aba;
	onSelect: (aba: Aba) => void;
};

/**
 * Menu de abas da biblioteca.
 *
 * No celular ele gruda no rodape, como a barra de um aplicativo: e onde o
 * polegar alcanca. A partir de `md` nao ha mais o que imitar, entao a mesma
 * barra vira uma peca discreta acima da lista, em vez de flutuar sobre o
 * conteudo numa tela larga.
 */
export default function LibraryNav({ aba, onSelect }: Props): JSX.Element {
	return (
		<nav
			aria-label="Secoes da biblioteca"
			className="
				fixed inset-x-0 bottom-0 z-40 border-t border-zinc-300 bg-[var(--background)]
				pb-[env(safe-area-inset-bottom)]
				md:static md:mx-auto md:mb-8 md:w-fit md:rounded-full md:border md:border-zinc-300
			"
		>
			<div role="tablist" className="grid grid-cols-3 md:flex md:gap-1 md:p-1">
				{ITENS.map((item) => {
					const ativa = item.aba === aba;
					const Icone = item.icone;

					return (
						<button
							key={item.aba}
							type="button"
							role="tab"
							aria-selected={ativa}
							onClick={() => onSelect(item.aba)}
							className={`
								flex flex-col items-center justify-center gap-1 px-2 py-2 transition
								md:flex-row md:gap-2 md:rounded-full md:px-4 md:py-1.5
								${ativa
									? "text-[var(--purple-dark)] dark:text-[var(--purple-light)] md:bg-[var(--purple-dark)] md:text-white md:dark:text-white"
									: "text-zinc-600 dark:text-zinc-400 hover:text-[var(--purple-dark)] dark:hover:text-[var(--purple-light)]"}
							`}
						>
							<Icone aria-hidden className="h-6 w-6 md:h-5 md:w-5" />
							<span className={`text-[0.7rem] md:text-sm ${ativa ? "font-semibold" : "font-medium"}`}>
								{item.rotulo}
							</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
