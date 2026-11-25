"use client";

import type { JSX } from "react";
import type { SalvarNaConta } from "@/hooks/useSalvarNaConta";

const ROTULOS: Record<SalvarNaConta["estado"], string> = {
	inativo: "Salvo apenas neste navegador",
	pendente: "Alterações não salvas",
	salvando: "Salvando…",
	salvo: "Salvo na conta",
	erro: "Não foi possível salvar",
};

type Props = {
	conta: SalvarNaConta;
	/** Falso para anonimo: a barra da conta so aparece para quem entrou. */
	autenticado: boolean;
};

/**
 * Botao explicito e indicador de estado do salvamento na conta.
 *
 * Para quem nao esta logado o componente explica onde o rascunho esta, sem
 * oferecer um botao que nao pode funcionar. O rascunho local vale nos dois casos.
 */
export default function SalvarNaContaBotao({ conta, autenticado }: Props): JSX.Element {
	if (!autenticado) {
		return (
			<p className="text-sm text-zinc-500 dark:text-zinc-500" data-testid="conta-anonimo">
				Seu rascunho fica salvo neste navegador. Entre na conta para abrir em outro
				dispositivo.
			</p>
		);
	}

	const salvando = conta.estado === "salvando";

	return (
		<div className="flex flex-wrap items-center justify-center gap-3" data-testid="conta-barra">
			<button
				type="button"
				onClick={() => {
					void conta.salvarAgora();
				}}
				disabled={salvando || !conta.podeSalvar}
				title={
					conta.podeSalvar
						? "Salvar este zine na sua conta"
						: "Dê um título ao zine para salvar na conta"
				}
				className="rounded-md bg-[var(--purple-dark)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
			>
				Salvar na conta
			</button>

			<span
				role="status"
				aria-live="polite"
				data-estado={conta.estado}
				className={
					conta.estado === "erro"
						? "text-sm text-red-600 dark:text-red-400"
						: "text-sm text-zinc-600 dark:text-zinc-400"
				}
			>
				{ROTULOS[conta.estado]}
			</span>

			{conta.erro ? (
				<span className="text-sm text-red-600 dark:text-red-400">{conta.erro}</span>
			) : null}
		</div>
	);
}
