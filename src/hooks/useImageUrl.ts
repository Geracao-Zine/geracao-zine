"use client";

import { useMemo } from "react";
import { getImage } from "@/lib/image-store";

/**
 * URL de objeto para os bytes de uma imagem da sessao.
 *
 * As URLs ficam em cache pelo `assetId`, com a mesma vida util do store de
 * bytes. Revogar na desmontagem nao serve: em StrictMode o React monta,
 * desmonta e monta de novo sem recalcular o `useMemo`, entao a URL revogada
 * continuaria em uso pela miniatura e pelo preview e nada seria desenhado.
 *
 * Sem bytes (pagina recarregada) devolve null: quem consome nao desenha nada.
 */
const urls = new Map<string, string>();

function urlFor(assetId: string): string | null {
        const cached = urls.get(assetId);

        if (cached) {
                return cached;
        }

        const stored = getImage(assetId);

        if (!stored) {
                return null;
        }

        const url = URL.createObjectURL(new Blob([new Uint8Array(stored.bytes)], { type: stored.mime }));
        urls.set(assetId, url);

        return url;
}

export function useImageUrl(assetId: string | null): string | null {
        return useMemo(() => (assetId ? urlFor(assetId) : null), [assetId]);
}
