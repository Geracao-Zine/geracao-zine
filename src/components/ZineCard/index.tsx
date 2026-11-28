"use client";

import Link from "next/link";
import type { JSX } from "react";
import type { ZineDaConta } from "@/lib/zines/client";

type Props = {
        zine: ZineDaConta;
        /** Mostra o seletor de visibilidade; so o dono recebe. */
        onVisibilidade?: (zine: ZineDaConta, visibility: "private" | "public") => void;
        onFavoritar?: (zine: ZineDaConta) => void;
        /** Desabilita as acoes enquanto uma requisicao daquele card esta em voo. */
        ocupado?: boolean;
};

function dataCurta(iso: string): string {
        if (!iso) {
                return "";
        }

        const data = new Date(iso);

        return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}

/**
 * Um zine na listagem.
 *
 * As acoes mudam com o papel: quem escreveu edita e decide se divulga; quem
 * nao escreveu le e favorita. Editar o zine alheio nunca aparece, porque a API
 * tambem nao permite.
 */
export default function ZineCard({ zine, onVisibilidade, onFavoritar, ocupado = false }: Props): JSX.Element {
        const autor = zine.author.name ?? "Autor sem nome";
        const publico = zine.visibility === "public";

        return (
                <article
                        className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-md transition hover:shadow-xl"
                        data-testid="zine-card"
                        data-zine-id={zine.id}
                >
                        <div className="mb-4 flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-purple-900 p-4 text-center">
                                <h3 className="line-clamp-3 text-lg font-bold leading-tight text-white">{zine.title}</h3>
                        </div>

                        <p className="text-sm text-zinc-600">{autor}</p>
                        <p className="mb-4 text-xs text-zinc-500">
                                {zine.mine ? "Seu zine" : "Zine da comunidade"}
                                {dataCurta(zine.updatedAt) ? ` · ${dataCurta(zine.updatedAt)}` : ""}
                        </p>

                        {zine.mine ? (
                                <span
                                        className={
                                                publico
                                                        ? "mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                                        : "mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
                                        }
                                        data-testid="selo-visibilidade"
                                >
                                        {publico ? "Divulgado" : "Privado"}
                                </span>
                        ) : null}

                        <div className="mt-auto flex flex-wrap items-center gap-2">
                                {zine.mine ? (
                                        <>
                                                <Link
                                                        href={`/Editor?zine=${zine.id}`}
                                                        className="rounded-md bg-[var(--purple-dark)] px-3 py-1.5 text-sm font-medium text-white"
                                                >
                                                        Editar
                                                </Link>

                                                {onVisibilidade ? (
                                                        <label className="flex items-center gap-2 text-sm text-zinc-700">
                                                                <span className="sr-only">
                                                                        Visibilidade de {zine.title}
                                                                </span>
                                                                <select
                                                                        value={zine.visibility}
                                                                        disabled={ocupado}
                                                                        onChange={(evento) =>
                                                                                onVisibilidade(
                                                                                        zine,
                                                                                        evento.target.value === "public"
                                                                                                ? "public"
                                                                                                : "private"
                                                                                )
                                                                        }
                                                                        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
                                                                        data-testid="seletor-visibilidade"
                                                                >
                                                                        <option value="public">Divulgar</option>
                                                                        <option value="private">Privado</option>
                                                                </select>
                                                        </label>
                                                ) : null}
                                        </>
                                ) : (
                                        <>
                                                <Link
                                                        href={`/Library/${zine.id}`}
                                                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700"
                                                >
                                                        Visualizar
                                                </Link>

                                                {onFavoritar ? (
                                                        <button
                                                                type="button"
                                                                disabled={ocupado}
                                                                aria-pressed={zine.favorited}
                                                                onClick={() => onFavoritar(zine)}
                                                                className={
                                                                        zine.favorited
                                                                                ? "rounded-md bg-[var(--orange)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                                                                                : "rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 disabled:opacity-50"
                                                                }
                                                                data-testid="botao-favoritar"
                                                        >
                                                                {zine.favorited ? "Favoritado" : "Favoritar"}
                                                        </button>
                                                ) : null}
                                        </>
                                )}
                        </div>
                </article>
        );
}
