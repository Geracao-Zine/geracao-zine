"use client";

import { useSearchParams } from "next/navigation";
import type { JSX } from "react";
import { Suspense, useMemo } from "react";
import ZineWizard from "@/components/ZineWizard";
import type { ZineStep } from "@/domain";
import { coverFromParams, isZineStep } from "@/domain";

/**
 * Mantem vivos os links antigos (`/Editor?coverTitle=...`): os campos viram o
 * ponto de partida do rascunho, mas nunca sobrescrevem um rascunho ja salvo.
 */
function EditorPage(): JSX.Element {
	const searchParams = useSearchParams();
	const cover = useMemo(() => coverFromParams(searchParams), [searchParams]);
	const step = searchParams.get("etapa");
	const initialStep: ZineStep = isZineStep(step) ? step : "poems";

	return <ZineWizard seedCover={cover} initialStep={initialStep} />;
}

export default function EditorPageWrapper(): JSX.Element {
	return (
		<Suspense fallback={<div>Carregando editor...</div>}>
			<EditorPage />
		</Suspense>
	);
}
