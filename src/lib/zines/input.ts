import type { InputJsonValue } from "../../generated/prisma/internal/prismaNamespace.ts";
import { ZineError } from "./errors.ts";

export const VISIBILITIES = ["private", "public"] as const;

export type Visibility = (typeof VISIBILITIES)[number];

export function isVisibility(value: unknown): value is Visibility {
        return typeof value === "string" && (VISIBILITIES as readonly string[]).includes(value);
}

export const ZINE_TITLE_MAX_LENGTH = 200;

// Mesmo limite que o dominio usa para o titulo da capa; um titulo maior nao
// caberia no painel e so criaria conteudo que o editor nao reproduz.
export const ZINE_SLUG_MAX_LENGTH = 60;

/**
 * Campos aceitos na criacao. `ownerId` nao esta aqui de proposito: ele vem
 * sempre da sessao, nunca do corpo.
 */
export type NewZine = {
        title: string;
        content: InputJsonValue;
        contentVersion: number;
        visibility: Visibility;
};

/** Campos aceitos na atualizacao. Ausente significa "nao mexer". */
export type ZinePatch = {
        title?: string;
        content?: InputJsonValue;
        contentVersion?: number;
        visibility?: Visibility;
};

function asRecord(value: unknown): Record<string, unknown> | null {
        return typeof value === "object" && value !== null && !Array.isArray(value)
                ? (value as Record<string, unknown>)
                : null;
}

export function isPlainJson(value: unknown): value is InputJsonValue {
        if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                return true;
        }

        if (Array.isArray(value)) {
                return value.every(isPlainJson);
        }

        const record = asRecord(value);

        return record !== null && Object.values(record).every(isPlainJson);
}

function titleFrom(value: unknown): string {
        if (typeof value !== "string") {
                throw new ZineError("titulo_invalido", 400);
        }

        const title = value.trim();

        if (title.length === 0) {
                throw new ZineError("titulo_ausente", 400);
        }

        if (title.length > ZINE_TITLE_MAX_LENGTH) {
                throw new ZineError("titulo_longo", 400);
        }

        return title;
}

function contentVersionFrom(value: unknown): number {
        if (value === undefined) {
                throw new ZineError("versao_ausente", 400);
        }

        if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
                throw new ZineError("versao_invalida", 400);
        }

        return value;
}

function visibilityFrom(value: unknown): Visibility {
        if (!isVisibility(value)) {
                throw new ZineError("visibilidade_invalida", 400);
        }

        return value;
}

function contentFrom(value: unknown): InputJsonValue {
        // `content` vai direto para uma coluna `jsonb`: so aceita JSON puro.
        // Sem esta checagem, um valor como `undefined` ou uma funcao chegariam
        // ao Prisma e o erro sairia como 500 em vez de 400.
        if (value === undefined) {
                throw new ZineError("conteudo_ausente", 400);
        }

        if (!isPlainJson(value)) {
                throw new ZineError("conteudo_invalido", 400);
        }

        return value;
}

export function newZineFrom(body: unknown): NewZine {
        const record = asRecord(body);

        if (!record) {
                throw new ZineError("corpo_invalido", 400);
        }

        return {
                title: titleFrom(record.title),
                content: contentFrom(record.content),
                contentVersion: contentVersionFrom(record.contentVersion),
                // Divulgar e o padrao: quem cria ja quer mostrar, e privar e uma
                // escolha do seletor depois. O schema tem o mesmo default.
                visibility: record.visibility === undefined ? "public" : visibilityFrom(record.visibility),
        };
}

export function zinePatchFrom(body: unknown): ZinePatch {
        const record = asRecord(body);

        if (!record) {
                throw new ZineError("corpo_invalido", 400);
        }

        const patch: ZinePatch = {};

        if (record.title !== undefined) {
                patch.title = titleFrom(record.title);
        }

        if (record.content !== undefined) {
                patch.content = contentFrom(record.content);
        }

        if (record.contentVersion !== undefined) {
                patch.contentVersion = contentVersionFrom(record.contentVersion);
        }

        if (record.visibility !== undefined) {
                patch.visibility = visibilityFrom(record.visibility);
        }

        return patch;
}
