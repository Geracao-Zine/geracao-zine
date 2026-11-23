"use client";

import type { JSX } from "react";
import type { ZineFormat } from "@/domain";
import { FORMAT_OPTIONS } from "@/domain";

export type { ZineFormat };

const LABEL = {
        fill: "currentColor",
        fontSize: 9,
        textAnchor: "middle",
} as const;

function FoldLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }): JSX.Element {
        return (
                <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                />
        );
}

/**
 * Diagrama da dobra com a ordem de leitura numerada.
 *
 * A numeracao e a mesma da imposicao: esquerda para a direita e de cima para
 * baixo. Assim o autor confere na tela o que vai receber no papel.
 */
function FormatDiagram({ format }: { format: ZineFormat }): JSX.Element {
        if (format === "banner-a4") {
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="39" y="10" width="42" height="60" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                                <text x="60" y="44" {...LABEL}>1</text>
                        </svg>
                );
        }

        if (format === "duas-colunas-vertical") {
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="39" y="10" width="42" height="60" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={60} y1={10} x2={60} y2={70} />
                                <text x="49" y="44" {...LABEL}>1</text>
                                <text x="71" y="44" {...LABEL}>2</text>
                        </svg>
                );
        }

        if (format === "duas-colunas-horizontal") {
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="18" y="10" width="84" height="60" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={18} y1={40} x2={102} y2={40} />
                                <text x="60" y="29" {...LABEL}>1</text>
                                <text x="60" y="59" {...LABEL}>2</text>
                        </svg>
                );
        }

        if (format === "quatro-retangulos") {
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="34" y="5" width="52" height="70" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={60} y1={5} x2={60} y2={75} />
                                <FoldLine x1={34} y1={40} x2={86} y2={40} />
                                <text x="47" y="27" {...LABEL}>1</text>
                                <text x="73" y="27" {...LABEL}>2</text>
                                <text x="47" y="61" {...LABEL}>3</text>
                                <text x="73" y="61" {...LABEL}>4</text>
                        </svg>
                );
        }

        if (format === "mini-zine") {
                // 4 colunas por 2 fileiras; a de baixo vai girada e o corte fica
                // entre as duas colunas do meio.
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="6" y="10" width="108" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={33} y1={10} x2={33} y2={70} />
                                <FoldLine x1={60} y1={10} x2={60} y2={70} />
                                <FoldLine x1={87} y1={10} x2={87} y2={70} />
                                <FoldLine x1={6} y1={40} x2={114} y2={40} />
                                <line x1="60" y1="10" x2="60" y2="70" stroke="currentColor" strokeWidth="2" />
                                <text x="19" y="30" {...LABEL}>8</text>
                                <text x="46" y="30" {...LABEL}>1</text>
                                <text x="73" y="30" {...LABEL}>2</text>
                                <text x="100" y="30" {...LABEL}>3</text>
                                <text x="100" y="62" {...LABEL}>4</text>
                                <text x="73" y="62" {...LABEL}>5</text>
                                <text x="46" y="62" {...LABEL}>6</text>
                                <text x="19" y="62" {...LABEL}>7</text>
                        </svg>
                );
        }

        if (format === "saddle-stitch") {
                // Cadernos dobrados na lombada, dois paineis por face: a capa e
                // a ultima pagina dividem a mesma folha.
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="20" y="8" width="80" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                                <rect x="15" y="12" width="80" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
                                <rect x="10" y="16" width="80" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={50} y1={16} x2={50} y2={80} />
                                <text x="30" y="50" {...LABEL}>2</text>
                                <text x="70" y="50" {...LABEL}>1</text>
                                <rect x="47" y="20" width="6" height="3" fill="currentColor" />
                                <rect x="47" y="72" width="6" height="3" fill="currentColor" />
                        </svg>
                );
        }

        if (format === "trifold") {
                // Tres colunas; a da direita entra para dentro e a capa fica na
                // esquerda, do lado de fora.
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="6" y="10" width="108" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={42} y1={10} x2={42} y2={70} />
                                <FoldLine x1={78} y1={10} x2={78} y2={70} />
                                <text x="24" y="44" {...LABEL}>1</text>
                                <text x="60" y="44" {...LABEL}>6</text>
                                <text x="96" y="44" {...LABEL}>3</text>
                        </svg>
                );
        }

        if (format === "z-fold") {
                // Sanfona de tres: as faces alternam de lado.
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="6" y="10" width="108" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={42} y1={10} x2={42} y2={70} />
                                <FoldLine x1={78} y1={10} x2={78} y2={70} />
                                <text x="24" y="30" {...LABEL}>1</text>
                                <text x="60" y="30" {...LABEL}>3</text>
                                <text x="96" y="30" {...LABEL}>5</text>
                                <text x="24" y="62" {...LABEL}>2</text>
                                <text x="60" y="62" {...LABEL}>4</text>
                                <text x="96" y="62" {...LABEL}>6</text>
                        </svg>
                );
        }

        if (format === "accordion") {
                // Quatro tiras continuas: a leitura vai e volta na sanfona.
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="4" y="10" width="112" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={32} y1={10} x2={32} y2={70} />
                                <FoldLine x1={60} y1={10} x2={60} y2={70} />
                                <FoldLine x1={88} y1={10} x2={88} y2={70} />
                                <text x="18" y="30" {...LABEL}>1</text>
                                <text x="46" y="30" {...LABEL}>3</text>
                                <text x="74" y="30" {...LABEL}>5</text>
                                <text x="102" y="30" {...LABEL}>7</text>
                                <text x="18" y="62" {...LABEL}>2</text>
                                <text x="46" y="62" {...LABEL}>4</text>
                                <text x="74" y="62" {...LABEL}>6</text>
                                <text x="102" y="62" {...LABEL}>8</text>
                        </svg>
                );
        }

        if (format === "gatefold") {
                // Duas portas fechadas sobre o miolo: a capa na porta direita.
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="4" y="10" width="112" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                                <line x1="32" y1="10" x2="32" y2="70" stroke="currentColor" strokeWidth="2" />
                                <line x1="88" y1="10" x2="88" y2="70" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={60} y1={10} x2={60} y2={70} />
                                <text x="18" y="44" {...LABEL}>8</text>
                                <text x="46" y="44" {...LABEL}>7</text>
                                <text x="74" y="44" {...LABEL}>6</text>
                                <text x="102" y="44" {...LABEL}>1</text>
                        </svg>
                );
        }

        if (format === "folio-unico") {
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="39" y="10" width="42" height="60" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                                <text x="60" y="36" {...LABEL}>1</text>
                                <text x="60" y="56" {...LABEL}>2</text>
                        </svg>
                );
        }

        if (format === "mini-zine-16") {
                // 4x4: dois cortes separam dois minizines de 8 paginas.
                return (
                        <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                                <rect x="24" y="2" width="72" height="76" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                                <FoldLine x1={42} y1={2} x2={42} y2={78} />
                                <FoldLine x1={60} y1={2} x2={60} y2={78} />
                                <FoldLine x1={78} y1={2} x2={78} y2={78} />
                                <FoldLine x1={24} y1={21} x2={96} y2={21} />
                                <FoldLine x1={24} y1={40} x2={96} y2={40} />
                                <FoldLine x1={24} y1={59} x2={96} y2={59} />
                                <line x1="24" y1="40" x2="96" y2="40" stroke="currentColor" strokeWidth="2" />
                                <text x="60" y="15" {...LABEL}>1</text>
                                <text x="60" y="34" {...LABEL}>4</text>
                                <text x="60" y="53" {...LABEL}>13</text>
                                <text x="60" y="72" {...LABEL}>16</text>
                        </svg>
                );
        }

        return (
                <svg viewBox="0 0 120 80" className="w-full h-20" aria-hidden="true">
                        <rect x="39" y="10" width="42" height="60" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                        <text x="60" y="44" {...LABEL}>1</text>
                </svg>
        );
}

export function FormatSelector({
        value,
        onChange,
}: {
        value: ZineFormat;
        onChange: (format: ZineFormat) => void;
}): JSX.Element {
        return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {FORMAT_OPTIONS.map((opt) => {
                                const selected = value === opt.id;
                                return (
                                        <button
                                                key={opt.id}
                                                disabled={!opt.available}
                                                onClick={() => opt.available && onChange(opt.id)}
                                                className={`
                                                        text-left p-4 rounded-2xl border-2 transition relative
                                                        ${!opt.available ? "opacity-50 cursor-not-allowed" : ""}
                                                        ${selected
                                                                ? "border-purple-600 bg-purple-50 dark:bg-purple-950/30"
                                                                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}
                                                `}
                                        >
                                                <div className="text-zinc-500 dark:text-zinc-400 mb-2">
                                                        <FormatDiagram format={opt.id} />
                                                </div>
                                                <div className="flex items-center justify-between mb-1">
                                                        <span className="font-semibold text-sm">{opt.label}</span>
                                                        <span className={`
                                                                text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full
                                                                ${opt.available
                                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                                                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"}
                                                        `}>
                                                                {opt.badge}
                                                        </span>
                                                </div>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                        {opt.description}
                                                </p>
                                        </button>
                                );
                        })}
                </div>
        );
}
