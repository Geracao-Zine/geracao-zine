"use client";
import Link from "next/link";
import Image from "next/image";
import logo_fundo_transparente from "@/assets/GeraçãoZine.png";
import { useEffect, useRef, useState } from "react";
import { GrMenu, GrClose } from "react-icons/gr";

const Navbar: React.FC = () => {
	const navRef = useRef<HTMLDivElement>(null);
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const el = navRef.current;
		if (!el) return;

		const aplicar = (): void => {
			// com o menu aberto o header encolhe, mas o overlay cobre a tela:
			// manter a altura do estado fechado evita o conteudo saltar
			if (isOpen) return;
			document.documentElement.style.setProperty(
				"--navbar-height",
				`${el.offsetHeight}px`,
			);
		};

		aplicar();

		// zoom, fonte base maior ou reflow mudam a altura depois do mount
		const observador = new ResizeObserver(aplicar);
		observador.observe(el);
		return () => observador.disconnect();
	}, [isOpen]);

	return (
		<header
			ref={navRef}
			className="
				w-full fixed top-0 left-0 z-50
				bg-[var(--background)]
				border-b border-zinc-300 dark:border-zinc-700
				text-[var(--foreground)]
			"
		>
			<div className="mx-auto max-w-7xl px-4 py-3">

				{/* TOP ROW */}
				<div className="flex items-center justify-between md:justify-between">

					{/* LOGO */}
					{!isOpen && (
						<Link
							href="/"
							className="
								flex justify-center md:justify-start
								w-full md:w-auto
							"
						>
							<Image
								width={44}
								height={44}
								alt="logotipo geracao zine"
								src={logo_fundo_transparente}
								className="drop-shadow-sm"
							/>
						</Link>
					)}

					{/* MOBILE MENU BUTTON */}
					<button
						onClick={() => setIsOpen(!isOpen)}
						className="md:hidden ml-auto z-50 top-6 right-6"
					>
						{isOpen ? <GrClose size={20} /> : <GrMenu size={20} />}
					</button>

					{/* DESKTOP NAV */}
					<nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
						<NavLinks />
					</nav>
				</div>

				{/* MOBILE NAV */}
				{isOpen && (
					<div className="fixed inset-0 z-40 bg-[var(--background)] flex flex-col items-center justify-center md:hidden">
						<nav className="flex flex-col items-center gap-8 text-lg font-semibold">
							{/* LOGO */}
							<Link
								href="/"
								className="
									flex justify-center md:justify-start
									w-full md:w-auto
								"
							>
								<Image
									width={100}
									height={100}
									alt="logotipo geracao zine"
									src={logo_fundo_transparente}
									className="drop-shadow-sm"
								/>
							</Link>
							<NavLinks onClick={() => setIsOpen(false)} />
						</nav>
					</div>
				)}
			</div>
		</header>
	);
};

interface NavProps {
	onClick?: () => void;
}

const NavLinks: React.FC<NavProps> = ({ onClick }) => (
	<>
		<Link
			href="/Create"
			onClick={onClick}
			className="px-3 py-1.5 rounded-full hover:text-[var(--orange)] transition-colors"
		>
			Criar meu Zine
		</Link>

		<Link
			href="/Library"
			onClick={onClick}
			className="px-3 py-1.5 rounded-full hover:text-[var(--orange)] transition-colors"
		>
			Explorar biblioteca
		</Link>

		<Link
			href="/Support"
			onClick={onClick}
			className="px-3 py-1.5 rounded-full hover:text-[var(--orange)] transition-colors"
		>
			Apoie
		</Link>
	</>
);

export default Navbar;