import type { ShapeKind } from "../../domain/shape-block.ts";
import type { FontId } from "../fonts.ts";
import type { PanelLayout, PanelRole } from "./panel-elements.ts";
import { orderedPanelElements } from "./panel-elements.ts";

export type PanelTextDrawable = {
        kind: "text";
        x: number;
        /** Linha de base, medida a partir do topo do painel. */
        y: number;
        text: string;
        size: number;
        color: number;
        role: PanelRole;
        font?: FontId;
        z: number;
};

export type PanelRuleDrawable = {
        kind: "rule";
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        thickness: number;
        color: number;
        z: number;
};

export type PanelShapeDrawable = {
        kind: "shape";
        shape: ShapeKind;
        x: number;
        y: number;
        width: number;
        height: number;
        thickness: number;
        color: number;
        z: number;
};

export type PanelImageDrawable = {
        kind: "image";
        x: number;
        y: number;
        width: number;
        height: number;
        clipX: number;
        clipY: number;
        clipWidth: number;
        clipHeight: number;
        assetId: string;
        z: number;
};

export type PanelDrawable =
        | PanelTextDrawable
        | PanelRuleDrawable
        | PanelShapeDrawable
        | PanelImageDrawable;

/**
 * Traduz um `PanelLayout` para comandos de desenho independentes do alvo.
 *
 * O PDF e o SVG do preview consomem esta mesma lista, na mesma ordem de
 * empilhamento, para que posicao, tamanho e sobreposicao nao divirjam.
 */
export function panelDrawables(layout: PanelLayout): PanelDrawable[] {
        return orderedPanelElements(layout).flatMap((element): PanelDrawable[] => {
                if (element.type === "image") {
                        return [
                                {
                                        kind: "image",
                                        x: element.rect.x,
                                        y: element.rect.y,
                                        width: element.rect.width,
                                        height: element.rect.height,
                                        clipX: element.clip.x,
                                        clipY: element.clip.y,
                                        clipWidth: element.clip.width,
                                        clipHeight: element.clip.height,
                                        assetId: element.content.assetId,
                                        z: element.z,
                                },
                        ];
                }

                if (element.type === "shape") {
                        return [
                                {
                                        kind: "shape",
                                        shape: element.shape,
                                        x: element.rect.x,
                                        y: element.rect.y,
                                        width: element.rect.width,
                                        height: element.rect.height,
                                        thickness: element.content.thickness,
                                        color: element.content.color,
                                        z: element.z,
                                },
                        ];
                }

                if (element.type === "rule") {
                        const y = element.rect.y + element.rect.height / 2;

                        return [
                                {
                                        kind: "rule",
                                        x1: element.rect.x,
                                        y1: y,
                                        x2: element.rect.x + element.rect.width,
                                        y2: y,
                                        thickness: element.content.thickness,
                                        color: element.content.color,
                                        z: element.z,
                                },
                        ];
                }

                return element.content.lines
                        .filter((line) => line.text !== "")
                        .map((line) => ({
                                kind: "text",
                                x: line.x,
                                y: line.baseline,
                                text: line.text,
                                size: element.content.size,
                                color: element.content.color,
                                role: element.content.role,
                                font: element.content.font,
                                z: element.z,
                        }));
        });
}
