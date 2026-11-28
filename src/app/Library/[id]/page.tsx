"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import CoverCard from "@/components/CoverCard";
import PoemPreview from "@/components/PoemPreview";
import { formatIsoDate, poemPages, type ZineDraft } from "@/domain";
import {
        alternarFavorito,
        draftDoZine,
        obterZine,
        type ZineDaConta,
} from "@/lib/zines/client";

type Estado =
        | { fase: "carregando" }
        | { fase: "erro"; motivo: string }
        | { fase: "pronto"; zine: ZineDaConta; draft: ZineDraft };

export default function LerZinePage(): JSX.Element {
        const { id } = useParams<{ id: string }>();
        const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
        const [ocupado, setOcupado] = useState(false);
        const [aviso, setAviso] = useState<string | null>(null);

        useEffect(() => {
                let vivo = true;

                void obterZine(id).then((resultado) => {
                        if (!vivo) {
                                return;
                        }

                        if (!resultado.ok) {
                                setEstado({ fase: "erro", motivo: resultado.motivo });
                                return;
                        }

                        const draft = draftDoZine(resultado.zine);

                        if (!draft) {
                                setEstado({ fase: "erro", motivo: "Este zine nao pode ser exibido." });
                                return;
                        }

                        setEstado({ fase: "pronto", zine: resultado.zine, draft });
                });

                return () => {
                        vivo = false;
                };
        }, [id]);

        const favoritar = useCallback((): void => {
                if (estado.fase !== "pronto") {
                        return;
                }

                setOcupado(true);
                setAviso(null);

                void alternarFavorito(estado.zine.id, !estado.zine.favorited).then((resultado) => {
                        setOcupado(false);

                        if (!resultado.ok) {
                                setAviso(resultado.motivo);
                                return;
                        }

                        setEstado((atual) =>
                                atual.fase === "pronto"
                                        ? { ...atual, zine: { ...atual.zine, favorited: resultado.favorited } }
                                        : atual
                        );
                });
        }, [estado]);

        if (estado.fase === "carregando") {
                return (
                        <main className="min-h-[calc(100vh-var(--navbar-height))] px-6 py-20">
                                <p className="text-center text-zinc-500">Carregando…</p>
                        </main>
                );
        }

        if (estado.fase === "erro") {
                return (
                        <main className="min-h-[calc(100vh-var(--navbar-height))] px-6 py-20">
                                <div className="mx-auto max-w-xl text-center">
                                        <p role="alert" className="mb-6 text-zinc-700">
                                                {estado.motivo}
                                        </p>
                                        <Link
                                                href="/Library"
                                                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
                                        >
                                                Voltar para a biblioteca
                                        </Link>
                                </div>
                        </main>
                );
        }

        const { zine, draft } = estado;
        const poems = poemPages(draft.doc);

        return (
                <main className="min-h-[calc(100vh-var(--navbar-height))] bg-[var(--background)] px-6 py-16 text-[var(--foreground)]">
                        <div className="mx-auto max-w-4xl">
                                <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                                <h1 className="text-3xl font-bold">{zine.title}</h1>
                                                <p className="text-sm text-zinc-600">
                                                        {zine.author.name ?? "Autor sem nome"}
                                                </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                                {zine.mine ? (
                                                        <Link
                                                                href={`/Editor?zine=${zine.id}`}
                                                                className="rounded-md bg-[var(--purple-dark)] px-4 py-2 text-sm font-medium text-white"
                                                        >
                                                                Editar
                                                        </Link>
                                                ) : (
                                                        <button
                                                                type="button"
                                                                disabled={ocupado}
                                                                aria-pressed={zine.favorited}
                                                                onClick={favoritar}
                                                                className={
                                                                        zine.favorited
                                                                                ? "rounded-md bg-[var(--orange)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                                                                : "rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
                                                                }
                                                                data-testid="botao-favoritar"
                                                        >
                                                                {zine.favorited ? "Favoritado" : "Favoritar"}
                                                        </button>
                                                )}

                                                <Link
                                                        href="/Library"
                                                        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
                                                >
                                                        Voltar
                                                </Link>
                                        </div>
                                </div>

                                {aviso ? (
                                        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                                                {aviso}
                                        </p>
                                ) : null}

                                <div className="mb-12 grid gap-8 sm:grid-cols-2">
                                        <div className="mx-auto w-full max-w-xs">
                                                <CoverCard cover={draft.cover} formattedDate={formatIsoDate(draft.cover.date)} />
                                        </div>
                                </div>

                                {poems.length === 0 ? (
                                        <p className="text-center text-zinc-500">Este zine ainda nao tem poesias.</p>
                                ) : (
                                        <div className="grid gap-10 md:grid-cols-2">
                                                {poems.map((poem) => (
                                                        <PoemPreview
                                                                key={poem.id}
                                                                title={poem.title}
                                                                subtitle={poem.subtitle}
                                                                date={formatIsoDate(poem.date)}
                                                                body={poem.body}
                                                                blocks={poem.blocks}
                                                                shapes={poem.shapes}
                                                                font={draft.cover.titleFont}
                                                                format={draft.format}
                                                                safetyMargin={draft.safetyMargin}
                                                                image={null}
                                                        />
                                                ))}
                                        </div>
                                )}
                        </div>
                </main>
        );
}
