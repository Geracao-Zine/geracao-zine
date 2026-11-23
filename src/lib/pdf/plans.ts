import type { SheetPlan, SpreadPlan } from "./templates.ts";

/**
 * Ordem das paginas em cada dobra.
 *
 * Fica separado de `templates.ts` porque aqui nao ha medida nenhuma: so a
 * posicao de cada pagina. Assim as constantes de diagramacao continuam
 * concentradas em `layout.ts`, e a grade de cada dobra em `templates.ts`.
 *
 * Pagina 1-based; 0 reserva o slot a branco.
 */

/**
 * Minizine: uma folha A4 deitada, 4 colunas por 2 fileiras, vira um livrinho de
 * 8 paginas depois de um corte no meio e das dobras.
 *
 * Os pares que se abrem juntos sao (8,1), (2,3), (4,5) e (6,7). A fileira de
 * baixo vai de cabeca para baixo porque a folha gira meia volta ao ser dobrada.
 */
export const MINIZINE_PLAN: SheetPlan = {
        pageCount: 8,
        pages: [8, 1, 2, 3, 7, 6, 5, 4],
        upsideDown: [4, 5, 6, 7],
};

/**
 * Livrinho de 16 paginas: a mesma folha do minizine, com 4 fileiras.
 *
 * O corte horizontal separa dois minizines de 8 paginas empilhados: o de cima
 * leva as paginas 1 a 8 e o de baixo, 9 a 16. Cada metade mantem a regra do
 * minizine, inclusive a fileira de baixo girada 180 graus.
 */
export const MINIZINE16_PLAN: SheetPlan = {
        pageCount: 16,
        pages: [8, 1, 2, 3, 7, 6, 5, 4, 16, 9, 10, 11, 15, 14, 13, 12],
        upsideDown: [4, 5, 6, 7, 12, 13, 14, 15],
};

/**
 * Tríptico (dobra carta): tres paineis por face, 6 paginas.
 *
 * A folha e dobrada com a face impressa para baixo: a porta da direita entra
 * primeiro e a da esquerda cobre por cima, por isso a capa fica na coluna da
 * esquerda do lado de fora. Leitura: capa (1), abre e ve (2,3), desdobra e ve
 * (4,5), fecha no verso (6).
 */
export const TRIFOLD_PLAN: SpreadPlan = {
        front: [1, 6, 3],
        back: [2, 4, 5],
};

/**
 * Dobra em Z: sanfona de tres paineis, 6 paginas.
 *
 * Os paineis alternam de lado: as faces da frente sao 1, 3 e 5, as de tras 2, 4
 * e 6. Leitura: 1, depois (2,3), depois (4,5), e o verso fecha em 6.
 */
export const ZFOLD_PLAN: SpreadPlan = {
        front: [1, 3, 5],
        back: [2, 4, 6],
};

/**
 * Acordeao: quatro tiras continuas, sem corte, 8 paginas.
 *
 * Mesma alternancia do Z, um painel a mais de cada lado. Leitura: 1, (2,3),
 * (4,5), (6,7) e o verso fecha em 8.
 */
export const ACCORDION_PLAN: SpreadPlan = {
        front: [1, 3, 5, 7],
        back: [2, 4, 6, 8],
};

/**
 * Gatefold: duas portas abrem para um painel central duplo, 8 paginas.
 *
 * Fechado, mostra a capa (1) na porta da direita e a pagina 8 na da esquerda;
 * virado, mostra (6,7). Abrindo a porta da direita aparecem (2,3) e, abrindo a
 * da esquerda, (4,5) — por isso o miolo desce em ordem no papel.
 */
export const GATEFOLD_PLAN: SpreadPlan = {
        front: [8, 7, 6, 1],
        back: [5, 4, 3, 2],
};

/** Folha unica: uma poesia por face, 2 paginas. */
export const FOLIO_PLAN: SpreadPlan = {
        front: [1],
        back: [2],
};
