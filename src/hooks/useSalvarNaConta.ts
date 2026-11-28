"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ZineDraft } from "@/domain";
import {
	atualizarZineNaConta,
	criarZineNaConta,
	definirVisibilidade as alterarVisibilidade,
	podeSalvar,
} from "@/lib/zines/client";
import { debounce } from "@/lib/debounce";

/**
 * - `inativo`: ninguem logado, ou nada foi salvo ainda.
 * - `pendente`: ha alteracao esperando o debounce.
 * - `salvando`: requisicao em andamento.
 * - `salvo`: a conta tem a versao atual.
 * - `erro`: a ultima tentativa falhou; o rascunho local continua intacto.
 */
export type EstadoSalvamento = "inativo" | "pendente" | "salvando" | "salvo" | "erro";

export type SalvarNaConta = {
	estado: EstadoSalvamento;
	/** Mensagem para a tela quando `estado` e `erro`. */
	erro: string | null;
	/** Id do zine na conta, quando ja existe. */
	zineId: string | null;
	/** Verdadeiro quando ha um titulo e o salvamento automatico pode rodar. */
	podeSalvar: boolean;
	/** Forca a gravacao agora, sem esperar o debounce. */
	salvarAgora: () => Promise<void>;
	/** Descarta o que estiver pendente. */
	cancelar: () => void;
	/**
	 * Esquece o zine da conta.
	 *
	 * Usado quando o autor comeca um zine novo: sem isso, o proximo
	 * salvamento sobrescreveria o zine anterior com o rascunho vazio.
	 */
	desvincular: () => void;
	/**
	 * Assume um zine que ja existe na conta.
	 *
	 * Sem isso, abrir um zine pela biblioteca faria o primeiro salvamento criar
	 * outro zine em vez de atualizar o que foi aberto.
	 */
	adotar: (zineId: string, draft: ZineDraft, visibility: "private" | "public") => void;
	/**
	 * Visibilidade do zine na conta; `null` enquanto nada foi salvo.
	 *
	 * Enquanto e `null` o interruptor do editor fica desligado: nao ha zine
	 * para divulgar antes do primeiro salvamento.
	 */
	visibility: "private" | "public" | null;
	/** Divulga ou priva o zine ja gravado, sem tocar no conteudo. */
	definirVisibilidade: (visibility: "private" | "public") => Promise<boolean>;
};

/**
 * Espelha o rascunho na conta de quem esta logado.
 *
 * O `localStorage` continua sendo a fonte de verdade enquanto a pessoa edita:
 * toda falha de rede deixa o rascunho local como estava. Se a conta nao
 * responde, o autor perde no maximo o espelhamento, nunca o texto.
 */
export function useSalvarNaConta(
	draft: ZineDraft,
	autenticado: boolean,
	ativo: boolean
): SalvarNaConta {
	const [estado, setEstado] = useState<EstadoSalvamento>("inativo");
	const [erro, setErro] = useState<string | null>(null);
	const [zineId, setZineId] = useState<string | null>(null);
	const [visibility, setVisibility] = useState<"private" | "public" | null>(null);

	const idRef = useRef<string | null>(null);
	const emVoo = useRef(false);
	const ultimoSalvo = useRef<string | null>(null);

	useEffect(() => {
		idRef.current = zineId;
	}, [zineId]);

	const gravar = useCallback(async (alvo: ZineDraft): Promise<void> => {
		if (!podeSalvar(alvo)) {
			return;
		}

		// Uma requisicao por vez: duas em paralelo poderiam criar dois zines
		// para o mesmo rascunho, porque o id so existe depois da primeira.
		if (emVoo.current) {
			return;
		}

		emVoo.current = true;
		setEstado("salvando");
		setErro(null);

		const serializado = JSON.stringify({ ...alvo, step: "cover" });
		const resultado = idRef.current
			? await atualizarZineNaConta(idRef.current, alvo)
			: await criarZineNaConta(alvo);

		emVoo.current = false;

		if (resultado.ok) {
			ultimoSalvo.current = serializado;

			// Um PATCH em zine apagado em outra aba volta como zine novo, entao o
			// id recebido pode diferir do atual: adotar evita 404 em toda gravacao.
			if (resultado.zine.id !== idRef.current) {
				idRef.current = resultado.zine.id;
				setZineId(resultado.zine.id);
			}

			setVisibility(resultado.zine.visibility);
			setEstado("salvo");
			return;
		}

		// O rascunho local nao e tocado aqui: e o que garante que uma falha
		// de rede nao descarta o que a pessoa escreveu.
		setErro(resultado.motivo);
		setEstado("erro");
	}, []);

	const agendado = useRef<ReturnType<typeof debounce<[ZineDraft]>> | null>(null);

	useEffect(() => {
		agendado.current = debounce<[ZineDraft]>((alvo) => {
			void gravar(alvo);
		});

		return () => {
			// Ao desmontar (sair da pagina), o que estava agendado e gravado
			// agora, em vez de esperar um prazo que nao vai chegar.
			agendado.current?.liberar();
			agendado.current?.cancelar();
		};
	}, [gravar]);

	useEffect(() => {
		if (!ativo || !autenticado || !podeSalvar(draft)) {
			return;
		}

		const serializado = JSON.stringify({ ...draft, step: "cover" });

		// Voltar a um estado ja gravado nao gera requisicao: sem isso, ir e
		// voltar numa etapa regravaria o mesmo conteudo.
		if (serializado === ultimoSalvo.current) {
			return;
		}

		setEstado("pendente");
		agendado.current?.agendar(draft);
	}, [draft, ativo, autenticado]);

	const salvarAgora = useCallback(async (): Promise<void> => {
		agendado.current?.cancelar();
		await gravar(draft);
	}, [draft, gravar]);

	const cancelar = useCallback((): void => {
		agendado.current?.cancelar();
	}, []);

	const desvincular = useCallback((): void => {
		agendado.current?.cancelar();
		idRef.current = null;
		ultimoSalvo.current = null;
		setZineId(null);
		setVisibility(null);
		setErro(null);
		setEstado("inativo");
	}, []);

	const adotar = useCallback(
		(id: string, alvo: ZineDraft, visibilidade: "private" | "public"): void => {
			agendado.current?.cancelar();
			idRef.current = id;
			// O conteudo recem-aberto ja e o que esta na conta: sem esta marca, o
			// primeiro efeito de espelhamento gravaria o mesmo conteudo de novo.
			ultimoSalvo.current = JSON.stringify({ ...alvo, step: "cover" });
			setZineId(id);
			setVisibility(visibilidade);
			setErro(null);
			setEstado("salvo");
		},
		[]
	);

	const definirVisibilidade = useCallback(
		async (alvo: "private" | "public"): Promise<boolean> => {
			const id = idRef.current;

			// Sem id nao ha zine na conta ainda: publicar exige que o conteudo ja
			// esteja gravado, senao o link publico apontaria para nada.
			if (!id) {
				setErro("Salve o zine na conta antes de divulgar.");
				return false;
			}

			setErro(null);

			const resultado = await alterarVisibilidade(id, alvo);

			if (!resultado.ok) {
				setErro(resultado.motivo);
				return false;
			}

			setVisibility(resultado.zine.visibility);

			return true;
		},
		[]
	);

	// Sair da pagina com alteracao pendente: grava antes de fechar.
	useEffect(() => {
		const aoSair = (): void => {
			agendado.current?.liberar();
		};

		window.addEventListener("pagehide", aoSair);

		return () => {
			window.removeEventListener("pagehide", aoSair);
		};
	}, []);

	return {
		estado: autenticado ? estado : "inativo",
		erro,
		zineId,
		podeSalvar: podeSalvar(draft),
		salvarAgora,
		cancelar,
		desvincular,
		adotar,
		visibility,
		definirVisibilidade,
	};
}
