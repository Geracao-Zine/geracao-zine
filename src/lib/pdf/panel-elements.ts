/**
 * Representacao de um painel como elementos posicionados.
 *
 * As coordenadas sao absolutas dentro do painel: a origem fica no canto
 * superior esquerdo e y cresce para baixo, a mesma convencao do preview. O
 * layout algoritmico produz esta representacao; o preview e o PDF continuam
 * consumindo `PanelPageLayout`, que e derivado dela.
 */

export type PanelRole = "title" | "subtitle" | "date" | "body" | "label";

export type PanelRect = {
        x: number;
        y: number;
        width: number;
        height: number;
};

/** Uma linha de texto posicionada pela linha de base, medida a partir do topo do painel. */
export type PanelTextLine = {
        text: string;
        baseline: number;
};

export type PanelTextContent = {
        role: PanelRole;
        size: number;
        color: number;
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

export type PanelElement = PanelTextElement | PanelRuleElement;

export type PanelLayout = {
        width: number;
        height: number;
        elements: PanelElement[];
};
