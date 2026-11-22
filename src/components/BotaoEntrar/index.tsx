"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { prepararLogin, type ResultadoCode } from "@/lib/auth/gis";

const aleatorio = (bytes: number): Uint8Array => crypto.getRandomValues(new Uint8Array(bytes));

type Props = {
	onNavegar?: () => void;
};

const BotaoEntrar: React.FC<Props> = ({ onNavegar }) => {
	const { sessao, config, entrar, desconectar } = useSession();
	const clientId = config.googleClientId ?? "";
	const [erro, setErro] = useState<string | null>(null);
	const [ocupado, setOcupado] = useState(false);
	const pedido = useRef<{ pedirCode: () => void } | null>(null);

	// `onNavegar` costuma chegar como arrow inline e muda de identidade a cada
	// render. Guardado numa ref, o efeito abaixo nao recria o cliente do Google
	// a cada tecla digitada na tela.
	const aoNavegar = useRef(onNavegar);

	useEffect(() => {
		aoNavegar.current = onNavegar;
	}, [onNavegar]);

	// O pedido e criado no mount para o clique abrir o popup dentro do gesto do
	// usuario; criar na hora do clique faria o navegador bloquear a janela.
	useEffect(() => {
		if (!clientId || sessao.status === "autenticado") {
			return;
		}

		let vivo = true;

		const aoResponder = (resultado: ResultadoCode): void => {
			if (!vivo) {
				return;
			}

			if (!resultado.ok) {
				setErro(resultado.motivo);
				setOcupado(false);
				return;
			}

			setOcupado(true);
			void entrar(resultado.code).then((motivo) => {
				if (!vivo) {
					return;
				}

				setErro(motivo);
				setOcupado(false);

				if (!motivo) {
					aoNavegar.current?.();
				}
			});
		};

		void prepararLogin({
			clientId,
			aleatorio,
			aoResponder,
		})
			.then((novo) => {
				if (vivo) {
					pedido.current = novo;
				}
			})
			.catch(() => {
				if (vivo) {
					setErro("Nao foi possivel carregar o login do Google.");
				}
			});

		return () => {
			vivo = false;
			pedido.current = null;
		};
	}, [clientId, sessao.status, entrar]);

	const clicar = useCallback((): void => {
		setErro(null);

		if (!pedido.current) {
			setErro("O login ainda esta carregando. Tente de novo em um instante.");
			return;
		}

		setOcupado(true);
		pedido.current.pedirCode();
	}, []);

	// Quem ja tem sessao continua podendo sair mesmo que o client id tenha sido
	// removido do servidor; so o botao de entrar depende da configuracao.
	if (sessao.status === "autenticado") {
		const nome = sessao.user.name ?? sessao.user.email;

		return (
			<div className="flex items-center gap-2">
				<span
					className="hidden text-sm text-zinc-600 sm:inline dark:text-zinc-400"
					title={sessao.user.email}
				>
					{nome}
				</span>
				<button
					type="button"
					onClick={() => {
						void desconectar();
					}}
					className="px-3 py-1.5 rounded-full hover:text-[var(--orange)] transition-colors"
				>
					Sair
				</button>
			</div>
		);
	}

	// Sem client id configurado no servidor, o botao nao aparece: abrir um popup
	// que o Google recusaria so confundiria o visitante.
	if (!clientId) {
		return null;
	}

	if (sessao.status === "carregando") {
		return <span className="px-3 py-1.5 text-sm text-zinc-500">Carregando…</span>;
	}

	return (
		<div className="flex flex-col items-start gap-1">
			<button
				type="button"
				onClick={clicar}
				disabled={ocupado}
				className="px-3 py-1.5 rounded-full bg-[var(--orange)] text-white font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
			>
				{ocupado ? "Entrando…" : "Entrar com Google"}
			</button>
			{erro && (
				<span role="alert" className="max-w-56 text-xs text-red-600 dark:text-red-400">
					{erro}
				</span>
			)}
		</div>
	);
};

export default BotaoEntrar;
