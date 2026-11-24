export const SLUG_MAX_LENGTH = 60;

// Sobras de acento que o `normalize("NFD")` separa e que precisam sumir para o
// slug ficar legivel na URL.
const DIACRITICOS = /[\u0300-\u036f]/g;

/**
 * Converte um titulo num identificador de URL: minusculas, sem acento, apenas
 * letras e digitos separados por hifen.
 *
 * Devolve string vazia quando o titulo nao tem nenhum caractere aproveitavel
 * (por exemplo, so pontuacao). Quem chama decide o que fazer nesse caso.
 */
export function slugify(title: string): string {
        const slug = title
                .normalize("NFD")
                .replace(DIACRITICOS, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, SLUG_MAX_LENGTH)
                // O corte pode deixar um hifen na ponta.
                .replace(/-+$/, "");

        return slug;
}

export const SLUG_FALLBACK = "zine";

/**
 * Acrescenta um sufixo curto para desempatar slugs iguais. O sufixo vem do id
 * do proprio zine: e estavel, nao depende do relogio e nao colide entre zines
 * diferentes (o id e um uuid).
 */
export function slugWithSuffix(base: string, id: string): string {
        const raiz = base.length > 0 ? base : SLUG_FALLBACK;
        const sufixo = id.replace(/-/g, "").slice(0, 8);
        // Reserva espaco para o hifen e o sufixo sem estourar o limite.
        const espaco = SLUG_MAX_LENGTH - sufixo.length - 1;

        return `${raiz.slice(0, espaco)}-${sufixo}`;
}
