"use client";

import type { JSX } from "react";
import type { PrintMode } from "@/domain";
import { PRINT_MODES } from "@/domain";

type Props = {
        value: PrintMode;
        onChange: (mode: PrintMode) => void;
};

/**
 * Escolha entre so frente e frente e verso.
 *
 * O aviso do duplex e explicito porque a impressora precisa estar configurada
 * para virar na borda longa: e a regra que a imposicao do verso assume.
 */
export default function PrintModeSelector({ value, onChange }: Props): JSX.Element {
        return (
                <div className="space-y-2">
                        <div className="grid gap-3 sm:grid-cols-2">
                                {PRINT_MODES.map((option) => {
                                        const selected = option.id === value;

                                        return (
                                                <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => onChange(option.id)}
                                                        aria-pressed={selected}
                                                        className={`
                                                                text-left p-4 rounded-2xl border-2 transition cursor-pointer
                                                                ${selected
                                                                        ? "border-purple-600 bg-purple-50 dark:bg-purple-950/30"
                                                                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"}
                                                        `}
                                                >
                                                        <span className="font-semibold text-sm block mb-1">
                                                                {option.label}
                                                        </span>
                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                                                {option.description}
                                                        </p>
                                                </button>
                                        );
                                })}
                        </div>

                        {value === "duplex" ? (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Na impressora, escolha frente e verso virando na borda longa. O PDF já traz
                                        o verso na ordem certa para essa opção.
                                </p>
                        ) : null}
                </div>
        );
}
