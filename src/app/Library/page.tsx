"use client";

import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import ZineCard from "@/components/ZineCard";
import { useSession } from "@/hooks/useSession";
import {
        alternarFavorito,
        definirVisibilidade,
        listarBiblioteca,
        listarFavoritos,
        listarZinesDaConta,
        type ZineDaConta,
} from "@/lib/zines/client";

type Aba = "biblioteca" | "meus" | "favoritos";

const ABAS: { id: Aba; rotulo: string }[] = [
        { id: "biblioteca", rotulo: "Biblioteca" },
        { id: "meus", rotulo: "Meus zines" },
        { id: "favoritos", rotulo: "Favoritos" },
];

const VAZIO: Record<Aba, string> = {
        biblioteca: "Ninguem divulgou um zine ainda. Seja a primeira pessoa.",
        meus: "Voce ainda nao tem zines. Crie um e ele aparece aqui.",
        favoritos: "Voce ainda nao favoritou nenhum zine.",
};

const MENSAGEM_SESSAO = "Entre para ver esta lista.";

export default function LibraryPage(): JSX.Element {
        const { sessao } = useSession();
        const autenticado = sessao.status === "autenticado";

        const [aba, setAba] = useState<Aba>("biblioteca");
        const [zines, setZines] = useState<ZineDaConta[]>([]);
        const [erro, setErro] = useState<string | null>(null);
        const [ocupado, setOcupado] = useState<string | null>(null);

        // A sessao chega depois da primeira pintura. Sem esperar por ela, a aba
        // "Meus zines" apareceria vazia para quem esta logado.
        const pronto = sessao.status !== "carregando";

        // `carregado` guarda qual aba ja respondeu. Comparar com a aba atual
        // evita um estado "carregando" separado que precisaria ser ligado e
        // desligado dentro do efeito.
        const [carregado, setCarregado] = useState<Aba | null>(null);
        const carregando = !pronto || carregado !== aba;

        useEffect(() => {
                if (!pronto) {
                        return;
                }

                let vivo = true;

                const pedido =
                        aba === "biblioteca"
                                ? listarBiblioteca()
                                : aba === "favoritos"
                                        ? listarFavoritos()
                                        : listarZinesDaConta();

                void pedido.then((lista) => {
                        if (vivo) {
                                setZines(lista);
                                setCarregado(aba);
                        }
                });

                return () => {
                        vivo = false;
                };
        }, [aba, pronto, autenticado]);

        const trocarFavorito = useCallback((zine: ZineDaConta): void => {
                setOcupado(zine.id);
                setErro(null);

                void alternarFavorito(zine.id, !zine.favorited).then((resultado) => {
                        setOcupado(null);

                        if (!resultado.ok) {
                                setErro(resultado.motivo);
                                return;
                        }

                        setZines((atuais) => {
                                const atualizados = atuais.map((item) =>
                                        item.id === zine.id ? { ...item, favorited: resultado.favorited } : item
                                );

                                // Na aba de favoritos, desfavoritar tira o zine da lista:
                                // deixa-lo ali com o coracao apagado confunde a lista.
                                return aba === "favoritos"
                                        ? atualizados.filter((item) => item.favorited)
                                        : atualizados;
                        });
                });
        }, [aba]);

        const mudarVisibilidade = useCallback(
                (zine: ZineDaConta, visibility: "private" | "public"): void => {
                        // Divulgar tira o zine do privado e o poe na biblioteca de todo
                        // mundo, com link proprio. Voltar a privar nao desfaz uma copia
                        // ja vista, entao a confirmacao vem antes de publicar.
                        if (
                                visibility === "public" &&
                                !window.confirm(
                                        `Divulgar “${zine.title}” na biblioteca publica? Qualquer pessoa com o link vai poder ler.`
                                )
                        ) {
                                return;
                        }

                        setOcupado(zine.id);
                        setErro(null);

                        void definirVisibilidade(zine.id, visibility).then((resultado) => {
                                setOcupado(null);

                                if (!resultado.ok) {
                                        setErro(resultado.motivo);
                                        return;
                                }

                                const atualizado = resultado.zine;

                                setZines((atuais) =>
                                        atuais.map((item) =>
                                                item.id === atualizado.id
                                                        ? { ...item, visibility: atualizado.visibility, slug: atualizado.slug }
                                                        : item
                                        )
                                );
                        });
                },
                []
        );

        const listaVisivel = aba === "biblioteca" || autenticado;
        const mensagemVazia = listaVisivel ? VAZIO[aba] : MENSAGEM_SESSAO;

        return (
                <main className="min-h-[calc(100vh-var(--navbar-height))] bg-[var(--background)] text-[var(--foreground)]">
                        <section className="mx-auto max-w-6xl px-6 py-20">
                                <div className="mb-12 text-center">
                                        <h1 className="mb-4 text-4xl font-bold md:text-5xl">
                                                Biblioteca de <span className="text-[var(--purple)]">Zines</span>
                                        </h1>
                                        <p className="text-zinc-600">Descubra criações independentes da comunidade.</p>
                                </div>

                                <div className="mb-8 flex flex-wrap justify-center gap-2" role="tablist">
                                        {ABAS.map((opcao) => (
                                                <button
                                                        key={opcao.id}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={aba === opcao.id}
                                                        onClick={() => setAba(opcao.id)}
                                                        className={
                                                                aba === opcao.id
                                                                        ? "rounded-full bg-[var(--purple-dark)] px-4 py-2 text-sm font-medium text-white"
                                                                        : "rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
                                                        }
                                                >
                                                        {opcao.rotulo}
                                                </button>
                                        ))}
                                </div>

                                {erro ? (
                                        <p
                                                role="alert"
                                                className="mx-auto mb-6 max-w-xl rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-700"
                                        >
                                                {erro}
                                        </p>
                                ) : null}

                                {carregando ? (
                                        <p className="text-center text-zinc-500">Carregando…</p>
                                ) : zines.length === 0 ? (
                                        <p className="text-center text-zinc-500">{mensagemVazia}</p>
                                ) : (
                                        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
                                                {zines.map((zine) => (
                                                        <ZineCard
                                                                key={zine.id}
                                                                zine={zine}
                                                                ocupado={ocupado === zine.id}
                                                                onVisibilidade={zine.mine ? mudarVisibilidade : undefined}
                                                                onFavoritar={zine.mine ? undefined : trocarFavorito}
                                                        />
                                                ))}
                                        </div>
                                )}
                        </section>
                </main>
        );
}
