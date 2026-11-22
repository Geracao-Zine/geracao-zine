"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicUser } from "@/lib/auth/users";
import {
	SESSION_INICIAL,
	buscarConfig,
	buscarSessao,
	entrarComCode,
	sair,
	type ConfigPublica,
	type SessionState,
} from "@/lib/auth/client";

export type UseSession = {
	sessao: SessionState;
	config: ConfigPublica;
	entrar: (code: string) => Promise<string | null>;
	desconectar: () => Promise<void>;
};

export function useSession(): UseSession {
	const [sessao, setSessao] = useState<SessionState>(SESSION_INICIAL);
	const [config, setConfig] = useState<ConfigPublica>({ googleClientId: null });
	const montado = useRef(true);

	useEffect(() => {
		montado.current = true;

		void buscarSessao().then((estado) => {
			if (montado.current) {
				setSessao(estado);
			}
		});

		void buscarConfig().then((publica) => {
			if (montado.current) {
				setConfig(publica);
			}
		});

		return () => {
			montado.current = false;
		};
	}, []);

	// Devolve a mensagem de erro, ou null quando entrou. Assim o componente que
	// tem o botao decide onde mostrar, sem o hook conhecer a tela.
	const entrar = useCallback(async (code: string): Promise<string | null> => {
		const resultado = await entrarComCode(code);

		if (!resultado.ok) {
			return resultado.motivo;
		}

		if (montado.current) {
			setSessao({ status: "autenticado", user: resultado.user });
		}

		return null;
	}, []);

	const desconectar = useCallback(async (): Promise<void> => {
		await sair();

		if (montado.current) {
			setSessao({ status: "anonimo" });
		}
	}, []);

	return { sessao, config, entrar, desconectar };
}

export type { PublicUser, SessionState };
