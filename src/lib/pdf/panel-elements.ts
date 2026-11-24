/**
 * Representacao de um painel como elementos posicionados.
 *
 * As coordenadas sao absolutas dentro do painel: a origem fica no canto
 * superior esquerdo e y cresce para baixo, a mesma convencao do preview. O
 * layout algoritmico produz esta representacao; o preview e o PDF continuam
 * consumindo `PanelPageLayout`, que e derivado dela.
 */

import type { FontId } from "../fonts.ts";

export type PanelRole = "title" | "subtitle" | "date" | "body" | "label";

export type TextAlign = "left" | "center" | "right";

export type PanelRect = {
        x: number;
        y: number;
        width: number;
        height: number;
};

/** Uma linha de texto posicionada pela esquerda e pela linha de base. */
export type PanelTextLine = {
        text: string;
        /** Coordenada absoluta da esquerda da linha dentro do painel. */
        x: number;
        /** Coordenada absoluta da linha de base, medida a partir do topo do painel. */
        baseline: number;
};

export type PanelTextContent = {
        role: PanelRole;
        size: number;
        color: number;
        align: TextAlign;
        /** Fonte do bloco; ausente no layout algoritmico, que resolve pelo papel. */
        font?: FontId;
        lines: PanelTextLine[];
};

export type PanelRuleContent = {
        color: number;
        thickness: number;
};

export type PanelTextElement = {
        type: "text";
        rect: PanelRect;
        content: PanelTextContent;
        /** Ordem de empilhamento: valores menores sao desenhados primeiro. */
        z: number;
};

export type PanelRuleElement = {
        type: "rule";
        rect: PanelRect;
        content: PanelRuleContent;
        /** Ordem de empilhamento: valores menores sao desenhados primeiro. */
        z: number;
};

export type PanelImageElement = {
        type: "image";
        rect: PanelRect;
        /** Faixa reservada no topo do painel: o desenho nunca passa daqui. */
        clip: PanelRect;
        content: { assetId: string };
        /** Ordem de empilhamento: valores menores sao desenhados primeiro. */
        z: number;
};

export type PanelElement = PanelTextElement | PanelRuleElement | PanelImageElement;

export type PanelLayout = {
        width: number;
        height: number;
        /** Margem de seguranca aplicada aos elementos; ausente equivale a zero. */
        inset?: number;
        elements: PanelElement[];
};

/** Elementos na ordem de empilhamento: menores desenhados primeiro. */
export function orderedPanelElements(layout: PanelLayout): PanelElement[] {
        return [...layout.elements].sort((a, b) => a.z - b.z);
}
