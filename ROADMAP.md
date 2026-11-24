# Roadmap — Geração Zine

Documento de ordenação das atividades do projeto. Cada fase tem objetivo, tarefas verificáveis e critério de conclusão. A ordem das fases é intencional: primeiro estabilizamos a base (build, deploy, bugs), depois padronizamos o código, e só então construímos o fluxo de criação e diagramação, que é a parte mais complexa e depende de uma base confiável.

## Visão

O Geração Zine é uma plataforma web para criadores independentes produzirem zines autorais e imprimíveis. O resultado final de cada sessão é um PDF pronto para impressão, diagramado conforme uma dobra escolhida pelo autor.

## Princípios

- O PDF é o produto. A interface existe para chegar nele.
- Pouca informação por vez: o autor cadastra, revisa e adapta aos poucos, sem formulários gigantes.
- O que o autor vê na tela precisa ser o que sai na impressão.
- Nenhuma funcionalidade nova entra sem build, tipagem e lint verdes.

## Estado atual (auditoria)

Levantamento refeito no commit `2e9dcd5`, branch `master`, depois das fases 1 a 6.

**O que funciona**

- Build, tipagem e lint verdes (`npm run build`, `npm run typecheck`, `npm run lint`).
- 340 testes automatizados em `node:test`; 338 passam e 2 pulam quando falta `DATABASE_URL`.
- Rotas: `/`, `/Create`, `/Editor`, `/Library`, `/Support`.
- Cadastro em quatro etapas com rascunho em `localStorage` e retomada de onde parou.
- Doze dobras com imposição implementada (T1–T12), em frente única e frente e verso.
- Motor único de medição alimentando preview e PDF, com ajuste de fonte por bisseção.
- Login com Google, sessão em JWT e tabela `users` no Postgres via Prisma.
- Deploy em Docker com Nginx, TLS e rollback documentados no README.

**O que falta**

| # | Pendência | Onde |
|---|---|---|
| P1 | Imagem não existe no modelo de página nem no PDF | `src/domain/page.ts`, `src/lib/pdf` |
| P2 | O zine não é persistido em conta: só vive em `localStorage` | `src/lib/draft-storage.ts` |
| P3 | `/Library` é placeholder estático, sem dados nem dono | `src/app/Library` |
| P4 | O layout é algorítmico e fixo: não há posicionamento livre de elementos | `src/lib/pdf/panel.ts` |
| P5 | Sem instruções de dobra nem nome de arquivo por título (as marcas de corte saíram na #29) | `src/lib/pdf/zine.ts` |
| P6 | O rascunho é gravado a cada tecla, sem debounce | `src/hooks/useZineEditor.ts` |
| P7 | Sem CI; os testes só rodam na máquina de quem desenvolve | — |

**Dependências desatualizadas**

| Pacote | Atual | Disponível |
|---|---|---|
| next | 16.4.6 | 16.4.6 (em dia) |
| react / react-dom | 19.3.1 | 19.3.1 (em dia) |
| tailwindcss / @tailwindcss/postcss | 4.3.5 | 4.3.5 (em dia) |
| eslint | 10.15.0 | 10.15.0 (em dia) |
| eslint-config-next | 16.4.6 | 16.4.6 (em dia) |
| @types/react / @types/react-dom | 19.3.0 | 19.3.0 (em dia) |
| @types/node | 26.6.6 | 26.6.6 (em dia) |
| react-icons | 5.7.0 | 5.7.0 (em dia) |
| ~~jspdf~~ | — | removido (nunca era usado) |
| pdf-lib | 1.17.1 | 1.17.1 (em dia) |
| typescript | 5.9.3 | 7.0.2 (bloqueado: `typescript-eslint` nao suporta TS 7) |

---

## Fase 1 — Node e dependências

Objetivo: base reprodutível, lint funcionando e versões alinhadas.

- [x] 1.1 Fixar a versão do Node com `.nvmrc` (Node 26 LTS) e declarar `"engines": { "node": "26.x" }` no `package.json`.
- [x] 1.2 Alinhar `@types/node` com a versão real do runtime (hoje `^20` com Node 24).
- [x] 1.3 Corrigir `eslint-config-next` de `0.2.4` para `^16.4.6` e validar `npm run lint` (resolve B1).
- [x] 1.4 Atualizar dependências de patch/minor: `next`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `@types/react`, `@types/react-dom`, `react-icons`, `jspdf`.
- [x] 1.5 Remover `jspdf` se permanecer sem uso após a Fase 6, ou consolidar a geração de PDF em uma única biblioteca (resolve B3). Removido: nunca era importado, o PDF é todo `pdf-lib`.
- [x] 1.6 Avaliar `typescript` 7 em tarefa isolada: `tsc` e `next build` passam, mas `npm run lint` quebra com `typescript-eslint does not support TS 7.0`. Mantido 5.9.3.
- [x] 1.7 Regenerar `package-lock.json`, verificar `npm ci` do zero e confirmar `build` + `lint` + `tsc --noEmit`.
- [x] 1.8 Adicionar `npm run typecheck` (`tsc --noEmit`) como script.

**Conclusão:** clone limpo → `npm ci` → `npm run lint`, `npm run typecheck` e `npm run build` passam sem avisos.

## Fase 2 — Docker e hospedagem em VPS

Objetivo: deploy reprodutível em VPS com imagem enxuta.

- [x] 2.1 `Dockerfile` multi-stage usando `output: "standalone"` no `next.config.ts`: estágio `deps` → `builder` → `runner` (`node:26-alpine`), usuário não-root.
- [x] 2.2 `.dockerignore` cobrindo `node_modules`, `.next`, `.git`, `*.md`.
- [x] 2.3 `docker-compose.yml` com serviço da aplicação, porta configurável, `restart: unless-stopped` e healthcheck em `/`.
- [x] 2.4 Variáveis de ambiente por `.env.example` documentado (sem segredos no repositório).
- [x] 2.5 Roteiro de deploy na VPS: Nginx como proxy reverso, certificado TLS (Let's Encrypt) e headers de segurança básicos. Feito em #9: o README tem a seção de deploy com proxy, certbot e snippet de headers, coberta por `tests/deploy-docs.test.mjs`.
- [ ] 2.6 Publicação de imagem (GHCR) e instrução de atualização (`pull` + `up -d`).
- [x] 2.7 Documentar no README: requisitos, comandos de build/execução e rollback. Feito: seções "Requisitos", "Como rodar" e "Rollback".

**Conclusão:** `docker compose up -d --build` sobe a aplicação em VPS e responde em HTTPS.

## Fase 3 — Caça e correção de bugs

Objetivo: zerar os defeitos conhecidos e evitar regressão.

- [x] 3.1 Corrigir B2 (classes Tailwind inválidas na navbar). Feito: a navbar usa os tokens do `globals.css` e `tests/navbar-classes.test.mjs` impede a volta das classes inexistentes.
- [x] 3.2 Corrigir B4 (imports mortos) e B5 (`any` em `wrapText`). Feito: nenhum import morto e o `any` virou regra de lint com teste próprio.
- [x] 3.3 Remover B6 (`console.log`) e qualquer log de depuração remanescente. Feito: `tests/no-debug-leftovers.test.mjs` varre o `src` e as chamadas de console ficaram concentradas no módulo de log.
- [x] 3.4 Reescrever o modelo de dados do editor para eliminar B9 e B10: uma lista única e estável de páginas com `id`, sendo a capa um item tipado, não um índice mágico. Feito em #11.
- [x] 3.5 Corrigir B11: palavra maior que a largura máxima deve ser quebrada por caractere. Feito em #12 (`breakWord`).
- [x] 3.6 Corrigir B12: transbordo de poema deve ser controlado (ver Fase 6, ajuste automático de fonte) e, quando ainda assim estourar, gerar continuação identificada. Feito em #24.
- [x] 3.7 Corrigir B13 (altura da navbar via variável, sem `mt-14` fixo) e B14 (fonte do `body`). Feito em #16.
- [x] 3.8 Corrigir B8: a fonte escolhida no cadastro deve valer no preview e no PDF (embutir a fonte no PDF). Feito em #15: `embedZineFonts` embute o TTF e o preview carrega a mesma face.
- [x] 3.9 Corrigir B7: data opcional, editável e persistida. Feito em #14: campo `type="date"` na capa, data ISO no domínio e no rascunho.
- [ ] 3.10 Revisar estados vazios: nenhuma página, título em branco, texto só com espaços, caractere especial e acentuação no PDF.
- [ ] 3.11 Testar em telas pequenas e com teclado (foco visível, navegação por tab).

**Conclusão:** todos os itens B1–B17 fechados ou reclassificados com justificativa; nenhuma perda de conteúdo ao remover páginas.

## Fase 4 — Otimização

Objetivo: carregar rápido e não desperdiçar trabalho.

- [x] 4.1 Carregar `pdf-lib` por import dinâmico apenas ao gerar o PDF, reduzindo o bundle inicial do editor. Feito em #17.
- [x] 4.2 Isolar a geração de PDF em módulo puro, sem dependência de React, permitindo execução fora do componente. Feito em #17: `src/lib/pdf` não importa React e roda em teste com `node:test`.
- [x] 4.3 Memoizar cálculos de quebra de linha e medição de texto; evitar recomputar a cada tecla. Feito: o preview usa `useMemo` por formato. A #18 foi fechada porque a premissa não valia — a medição nunca rodou a cada tecla.
- [x] 4.4 Aplicar `next/image` corretamente nas imagens existentes e revisar o peso dos assets em `src/assets`. Feito na home e na navbar.
- [ ] 4.5 Debounce na persistência de rascunho. Reclassificado para o backlog contínuo: não é otimização de bundle, é conforto de escrita, e só passa a doer quando o rascunho for para a conta (8.3).
- [ ] 4.6 Medir com `next build` e Lighthouse; registrar números antes/depois neste documento.

**Conclusão:** bundle inicial do editor reduzido e geração de PDF sem bloquear a interface perceptivelmente.

## Fase 5 — Padronização de código

Objetivo: um único estilo, tipagem explícita e responsabilidades separadas.

- [x] 5.1 Tipagem explícita: proibir `any`, tipar retornos de função e props; `strict` já está ativo, reforçar com `@typescript-eslint/no-explicit-any` como erro. Feito em #19, com teste que varre o `src`.
- [x] 5.2 Ponto e vírgula obrigatório ao final das linhas de comando, garantido por regra de lint (`semi`) e aplicado em todo o `src`. Feito em #19.
- [x] 5.3 Separar responsabilidades em camadas: `src/domain` (tipos e regras do zine), `src/lib` (quebra de texto, medição, PDF), `src/components` (apresentação), `src/app` (rotas e orquestração). Nenhum componente de tela gera PDF diretamente.
- [x] 5.4 Extrair o estado do editor para um hook (`useZineEditor`). Feito em #20. O cadastro por etapas segue na #22.
- [x] 5.5 Padronizar nomes: componentes em PascalCase, hooks com prefixo `use`, tipos sem prefixo `I`, constantes em `SCREAMING_SNAKE_CASE`. Feito: os 11 componentes são PascalCase, os hooks são `useSession` e `useZineEditor`, nenhum tipo usa prefixo `I` e as constantes são maiúsculas.
- [x] 5.6 Substituir strings mágicas (medidas A4, margens, tamanhos de fonte) por constantes nomeadas em um único arquivo de configuração de diagramação (`src/lib/pdf/layout.ts`).
- [ ] 5.7 Centralizar o design system: remover classes arbitrárias repetidas, usar os tokens já definidos em `globals.css`.
- [ ] 5.8 Revisar acessibilidade básica: `label` associado a `input`, `aria-*` nos seletores, contraste.
- [x] 5.9 Documentar as convenções no README e garantir que o lint as imponha. Feito: seção "Convenções de código" no README; `any` e `semi` são erro de lint com teste que verifica a própria configuração.

**Conclusão:** lint sem exceções, zero `any`, nenhuma regra de diagramação fora de `src/lib`, e um PR de padronização aplicado ao projeto inteiro.

## Fase 6 — Fluxo de criação e diagramação (funcionalidade principal)

Objetivo: o autor cadastra pouco por vez, escolhe a dobra, o sistema diagrama e entrega o PDF pronto para impressão.

### 6.1 Fluxo em etapas curtas

- [x] 6.1.1 Quebrar o cadastro em etapas com salvamento incremental: (1) capa e autoria, (2) poesias, (3) revisão, (4) dobra e impressão. Feito em #22 (PR #36).
- [x] 6.1.2 Persistir o rascunho localmente entre etapas, permitindo voltar e adaptar sem perder o que já foi escrito. Feito em #22.
- [x] 6.1.3 Permitir adicionar, editar, reordenar e remover poesias a qualquer momento, com confirmação em ações destrutivas. Feito: `addPage`, `movePage` e `removePage` operam por `id`, e a remoção pede confirmação.
- [x] 6.1.4 Exibir progresso e pendências (ex.: "2 poesias sem título", "1 página vazia"). Feito: `draftIssues` gera as pendências e o `IssueList` mostra em cada etapa.
- [x] 6.1.5 Só liberar a etapa de dobra quando houver conteúdo mínimo válido. Feito: `canEnterStep` e `stepStatus` barram a etapa no `StepNav`.

### 6.2 Conteúdo de cada página do zine

Cada página do zine (não a folha A4, e sim o painel diagramado) tem esta composição:

- Título (opcional)
- Subtítulo (opcional)
- Data (opcional)
- Texto principal (obrigatório, com área limitada)

Regras de diagramação:

- [x] 6.2.1 O texto principal ocupa uma caixa de área fixa definida pela dobra; ele nunca ultrapassa essa caixa. Feito em #23.
- [x] 6.2.2 Ajuste automático de fonte: buscar por bisseção o maior corpo de fonte entre um mínimo e um máximo que faça o texto caber na caixa, respeitando entrelinha proporcional. Se o mínimo ainda não couber, dividir o texto em continuação com indicativo, nunca cortar em silêncio. Feito em #24.
- [x] 6.2.3 Campos opcionais vazios não reservam espaço: a caixa do texto se expande quando título, subtítulo ou data estão ausentes. Feito em #23.
- [x] 6.2.4 Hierarquia tipográfica fixa por painel: título > subtítulo > data > corpo, com proporções definidas em constantes. Feito em #23.
- [ ] 6.2.5 Respeitar quebras de linha do autor (estrofe e verso) e hifenizar apenas quando necessário. Parcial: `wrapText` já trata cada linha do autor como parágrafo e preserva linha vazia como estrofe; falta a hifenização.
- [x] 6.2.6 Pré-visualização fiel: o mesmo motor de medição alimenta preview e PDF. Feito em #24. O preview também mede no painel da dobra escolhida, não na largura da folha, desde #39.

### 6.3 Catálogo de dobras e templates

Cada dobra é um template com: quantidade de painéis por face, ordem de leitura, imposição (que painel vai em qual posição da folha) e número de páginas exigido.

| ID | Template | Folha | Painéis por face | Páginas por folha | Observação |
|---|---|---|---|---|---|
| T1 | Banner A4 (uma poesia por folha) | A4 retrato | 1 | 1 | Uma poesia por folha, leitura em pé |
| T2 | Duas colunas vertical | A4 retrato | 2 | 2 | Dobra vertical no meio |
| T3 | Duas colunas horizontal | A4 paisagem | 2 | 2 | Dobra horizontal no meio |
| T4 | Quatro retângulos | A4 retrato | 4 | 4 | Dobra em cruz, 2×2 |
| T5 | Minizine de 8 páginas | A4 retrato | 8 | 8 | Dobra e corte clássicos |
| T6 | Tríptico (carta) | A4 paisagem | 3 | 6 | Dobra em três, painel menor para dentro |
| T7 | Dobra em Z | A4 paisagem | 3 | 6 | Leitura alternada, sanfona de 3 |
| T8 | Acordeão (sanfona) | A4 paisagem | 4 a 6 | 8 a 12 | Tiras contínuas, sem corte |
| T9 | Gatefold (portas) | A4 paisagem | 4 | 8 | Duas portas abrem para um painel central |
| T10 | Folha única frente e verso | A4 retrato | 1 | 2 | Uma poesia por face |
| T11 | Fanzine grampeado | Múltiplas A4 | 2 | múltiplos de 4 | Dobra na lombada e grampo |
| T12 | Livrinho de 16 páginas | A4 retrato | 16 | 16 | Minizine estendido com dois cortes |

- [x] 6.3.1 Implementar T1 a T4 (base pedida), com imposição correta e ordem de leitura definida. Feito em #25; a validação em impressão real segue em 6.3.6. Conferido em #39: nenhum painel vaza para a goteira ou para a margem, e a ordem de leitura sai correta nas quatro dobras.
- [x] 6.3.2 Implementar T5 e T11, que já existem como opção desabilitada no seletor. Feito: o minizine impõe as 8 páginas numa folha A4 deitada (capa como página 1, fileira de baixo girada 180° e frente única forçada) e o fanzine grampeado impõe cadernos com (última, primeira) na frente e (segunda, penúltima) no verso, crescendo em múltiplos de 4. Falta só a validação em impressão real, que segue em 6.3.6.
- [x] 6.3.3 Implementar T6 a T10 e T12 como alternativas de dobra. Feito: T6 (tríptico), T7 (dobra em Z), T8 (acordeão), T9 (gatefold), T10 (folha única frente e verso) e T12 (livrinho de 16 páginas) entraram no catálogo com imposição própria. Os planos de página de cada dobra ficaram declarados em `src/lib/pdf/plans.ts`, separados das medidas, e a imposição ganhou o tipo `spread` para frente e verso com páginas fixas. O aviso de excedente passou a valer para toda dobra de número fixo. Falta só a validação em impressão real, que segue em 6.3.6.
- [x] 6.3.4 Cada template define quantas poesias cabem e como paginar quando há mais texto que painéis. Feito em #25.
- [x] 6.3.5 Diagrama visual de cada dobra no seletor, mostrando a ordem de leitura. Feito em #25.
- [ ] 6.3.6 Validar cada template com uma impressão física: dobra, corte, ordem das páginas e legibilidade da margem de segurança.

### 6.4 Impressão e download

- [x] 6.4.1 Opção de apenas frente, ou frente e verso, com imposição de verso espelhada corretamente. Feito em #28: a escolha fica na etapa de dobra, o verso espelha a grade em torno do eixo da dobra (virar na borda longa), a capa reserva o verso em branco e o PDF completa o par quando o número de páginas é ímpar. Conferido em pixels: frente e verso alinham com desvio de no máximo 1 pt e nenhum painel vaza para a goteira ou a margem.
- [x] 6.4.2 Marcas de corte e dobra discretas, com margem de segurança configurável. Feito em #29: cada template declara as dobras e os cortes, o PDF desenha Ls discretos nos cantos e riscos curtos nas bordas (tracejado para dobra, contínuo para corte), e a margem de 0 a 10 mm reduz a caixa de texto no PDF e no preview. O texto nunca entra na faixa de corte.
- [x] 6.4.3 PDF em A4 real (595×842 pt) ou paisagem quando a dobra exigir, sem reescalonamento na impressão. Feito: a página é criada com o tamanho do template e os testes conferem 595×842 e 842×595 em cada dobra.
- [ ] 6.4.4 Nome do arquivo gerado a partir do título e da data.
- [ ] 6.4.5 Instruções de dobra e montagem incluídas como página final opcional do PDF.
- [ ] 6.4.6 Opção de numerar as páginas no PDF, com campo para marcar ou desmarcar na etapa de impressão.
- [ ] 6.4.7 Opção de girar a folha por tipo de dobra (vertical/horizontal), para imprimir na orientação oposta sem refazer a imposição.

**Conclusão:** o autor completa o fluxo em etapas, escolhe qualquer dobra do catálogo, recebe um PDF que, impresso e dobrado, sai na ordem correta e com o texto sempre dentro da caixa.

---

## Expansão em três eixos

As três fases seguintes ampliam o produto em eixos independentes: **imagem**, **conta e biblioteca** e **layout livre**. A independência é real e vale a pena preservá-la — cada eixo pode entrar sozinho, e a ordem entre eles é uma escolha de produto, não uma imposição técnica.

Dois deles, porém, compartilham uma **fundação**: imagem e layout livre precisam de uma representação de página que aceite elementos posicionados, e não só quatro campos de texto empilhados. Essa fundação é a tarefa 9.1, pré-requisito de 7.2 em diante e de 9.2 em diante. Ela aparece na Fase 9 por afinidade de assunto, mas precisa ser feita antes das outras duas. A Fase 8 não depende dela.

Esforço: **P** = até um dia, **M** = dois a quatro dias, **G** = uma semana ou mais. É estimativa de implementação, sem contar revisão e impressão de teste.

## Fase 7 — Imagem

Objetivo: o autor coloca uma imagem na página, redimensiona mantendo a proporção e escolhe o enquadramento, sem deformar.

A intenção declarada é **escala uniforme**: as alças redimensionam o retângulo inteiro mantendo a razão de aspecto, nunca um lado isolado. Esticar a imagem num eixo só é justamente o que a deforma — é o comportamento a evitar, não a oferecer. O recorte (o que fica visível) é uma operação separada da escala, e por isso aparece como tarefa própria (7.5).

| Item | Issue | Esforço | Depende de | Entrega |
|---|---|---|---|---|
| 7.1 Modelo de imagem no domínio | [#46](https://github.com/Geracao-Zine/geracao-zine/issues/46) | P | — | `PageImage` com `assetId`, tamanho natural, escala, deslocamento e retângulo de recorte. Normalização de JSON salvo, como já acontece com `PageFields`. |
| 7.2 Imagem no PDF a partir de um arquivo local | [#47](https://github.com/Geracao-Zine/geracao-zine/issues/47) | P | 9.1 | `pdf-lib` embute PNG e JPEG (`embedPng`, `embedJpg`). Desenho no painel respeitando a proporção. Cobre o caso de uma imagem fixa de teste, sem upload. |
| 7.3 Upload e armazenamento | [#49](https://github.com/Geracao-Zine/geracao-zine/issues/49) | M | 7.1 | Receber o arquivo, validar tipo e tamanho, gravar e servir. Exige decisão de infraestrutura: volume Docker com backup, ou storage S3-compatível. Ver "Decisões pendentes". |
| 7.4 Redimensionar com proporção travada | [#50](https://github.com/Geracao-Zine/geracao-zine/issues/50) | M | 7.2, 7.3 | Alças nos cantos e nas bordas que mudam a escala uniformemente. Um botão "livre" permite destravar, com aviso de deformação. |
| 7.5 Enquadramento (recorte) | [#51](https://github.com/Geracao-Zine/geracao-zine/issues/51) | M | 7.4 | Mover a imagem dentro da moldura sem mudar a moldura, e cortar o excedente. É o que o Canva chama de *crop*. |
| 7.6 Imagem de capa | [#48](https://github.com/Geracao-Zine/geracao-zine/issues/48) | P | 7.2 | A capa ganha uma imagem de fundo opcional, com o texto por cima. |
| 7.7 Aviso de resolução para impressão | [#52](https://github.com/Geracao-Zine/geracao-zine/issues/52) | P | 7.2 | Comparar os pixels disponíveis com o tamanho impresso e avisar abaixo de 300 dpi. É o aviso que evita a impressão borrada. |
| 7.8 Limites e recomposição | [#53](https://github.com/Geracao-Zine/geracao-zine/issues/53) | P | 7.3 | Tamanho máximo por arquivo, limite de imagens por zine e recomposição de imagem grande antes de gravar. |
| 7.9 Texto alternativo | [#54](https://github.com/Geracao-Zine/geracao-zine/issues/54) | P | 7.1 | Campo de descrição, usado no PDF acessível e no preview. |

Ordem sugerida: 7.1 → 7.2 → 7.6 → 7.3 → 7.4 → 7.5 → 7.7 → 7.8 → 7.9. A fatia 7.1 + 7.2 + 7.6 já entrega imagem na capa e no PDF sem upload, que é o teste mais barato da ideia.

Riscos: `pdf-lib` embute PNG e JPEG, mas **não** SVG nem WebP — converter no cliente ou recusar o formato. Imagem grande embutida infla o PDF: precisa de recomposição e de um teto de resolução, senão o download passa de dezenas de megabytes.

**Conclusão:** o autor envia uma foto, posiciona na capa e numa página, redimensiona sem deformar, recorta o enquadramento e recebe um PDF impresso com a imagem nítida — sem nenhuma imagem esticada em um eixo só.

## Fase 8 — Conta e biblioteca

Objetivo: quem entra com Google guarda seus zines na conta, marca o que é público e reaproveita o zine de outra pessoa.

Hoje o zine vive só em `localStorage`: trocar de navegador perde tudo. A tabela `users` e a sessão já existem, então o trabalho é de modelo e de API, não de autenticação.

| Item | Issue | Esforço | Depende de | Entrega |
|---|---|---|---|---|
| 8.1 Modelo `Zine` no schema | [#45](https://github.com/Geracao-Zine/geracao-zine/issues/45) | P | — | `ownerId`, `title`, `visibility` (`private`/`public`), `content` em JSON, `createdAt`/`updatedAt`, slug curto. Migration e teste de schema. |
| 8.2 API de zines com sessão | [#55](https://github.com/Geracao-Zine/geracao-zine/issues/55) | M | 8.1 | `POST`, `GET`, `PATCH`, `DELETE` em `/api/zines`, sempre filtrando por `ownerId` da sessão. Sem sessão, 401. |
| 8.3 Salvar na conta | [#56](https://github.com/Geracao-Zine/geracao-zine/issues/56) | M | 8.2 | Botão explícito "Salvar na conta" e salvamento automático para quem está logado. Anônimo continua em `localStorage`. |
| 8.4 Migrar o rascunho local no primeiro login | [#59](https://github.com/Geracao-Zine/geracao-zine/issues/59) | P | 8.3 | Ao entrar, oferecer levar o rascunho de `localStorage` para a conta. Sem isso o autor perde o que escreveu antes de criar conta. |
| 8.5 Meus zines | [#57](https://github.com/Geracao-Zine/geracao-zine/issues/57) | M | 8.2 | Lista com título, data, dobra e miniatura; abrir, duplicar e excluir. |
| 8.6 Biblioteca pública | [#60](https://github.com/Geracao-Zine/geracao-zine/issues/60) | M | 8.1 | `/Library` deixa de ser placeholder: lista os zines `public`, com busca e filtro por dobra. |
| 8.7 Alternar público e privado | [#58](https://github.com/Geracao-Zine/geracao-zine/issues/58) | P | 8.3 | Interruptor no editor e na lista. Privado é o padrão; publicar é ação explícita. |
| 8.8 Reaproveitar o zine de outra pessoa | [#61](https://github.com/Geracao-Zine/geracao-zine/issues/61) | P | 8.5, 8.6 | "Usar como base": copia o conteúdo para um zine novo do usuário, com atribuição ao autor original. Nunca edita o original. |
| 8.9 Cota, moderação e remoção | [#63](https://github.com/Geracao-Zine/geracao-zine/issues/63) | M | 8.6 | Limite de zines e de armazenamento por conta, denúncia de conteúdo público e remoção pelo dono do espaço. |
| 8.10 Página de um zine público | [#62](https://github.com/Geracao-Zine/geracao-zine/issues/62) | P | 8.6 | Rota com o zine, o autor e o botão de reaproveitar. |

Ordem sugerida: 8.1 → 8.2 → 8.3 → 8.5 → 8.7 → 8.4 → 8.6 → 8.8 → 8.10 → 8.9. As quatro primeiras já resolvem o problema real de hoje, que é perder o zine ao trocar de navegador. A biblioteca pública vem depois porque é a parte que cria obrigação de moderação.

Riscos: conteúdo público é conteúdo de terceiros — precisa de regra de remoção e de termos antes de abrir, não depois. E `content` em JSON livre dificulta migração futura; versionar o JSON desde o início (como já é feito com `DRAFT_VERSION`) custa pouco agora e muito depois.

**Conclusão:** quem entra com Google acha os próprios zines em qualquer navegador, marca um como público, e outra pessoa consegue partir dele para criar o seu — sem que ninguém edite o zine alheio.

## Fase 9 — Layout livre por componentes

Objetivo: o autor monta a página como no Canva — arrasta blocos de título, texto, imagem, traço e arquivo para qualquer posição, redimensiona, e escolhe entre partir de um template pronto ou de uma página em branco. As dobras continuam as mesmas: mudam os elementos dentro do painel, não a imposição.

O modelo atual é **algorítmico**: `layoutPanel` recebe quatro campos e devolve as linhas já posicionadas. Não existe lugar para "este bloco fica em x=120, y=300". O eixo 3 exige o contrário, e é por isso que a primeira tarefa não é interface, é contrato.

| Item | Issue | Esforço | Depende de | Entrega |
|---|---|---|---|---|
| 9.1 Representação de página posicionada | [#44](https://github.com/Geracao-Zine/geracao-zine/issues/44) | M | — | Um `PanelLayout` com elementos em coordenadas absolutas (tipo, retângulo, conteúdo, ordem). O layout algorítmico atual passa a **produzir** essa representação. Nenhuma mudança visível: é refatoração com os 340 testes como rede. |
| 9.2 Componentes de texto e título | [#64](https://github.com/Geracao-Zine/geracao-zine/issues/64) | P | 9.1 | Bloco de título e bloco de texto posicionáveis, com fonte, corpo, cor e alinhamento próprios. |
| 9.3 Renderizador de elementos no PDF e no preview | [#65](https://github.com/Geracao-Zine/geracao-zine/issues/65) | M | 9.1 | O mesmo `PanelLayout` alimenta `pdf-lib` e o SVG do preview, mantendo a paridade que já existe hoje. |
| 9.4 Selecionar, arrastar e redimensionar | [#66](https://github.com/Geracao-Zine/geracao-zine/issues/66) | G | 9.3 | Canvas com seleção, arraste e alças. Encaixe nas margens e no centro do painel, guias de alinhamento. |
| 9.5 Ordem de empilhamento | [#67](https://github.com/Geracao-Zine/geracao-zine/issues/67) | P | 9.4 | Trazer para frente, enviar para trás, travar elemento. |
| 9.6 Templates prontos como layout inicial | [#70](https://github.com/Geracao-Zine/geracao-zine/issues/70) | M | 9.1 | As doze dobras continuam funcionando; cada uma ganha um layout de exemplo que o autor pode editar depois de aplicar. |
| 9.7 Página em branco | [#68](https://github.com/Geracao-Zine/geracao-zine/issues/68) | P | 9.4 | Começar sem nada e adicionar blocos. |
| 9.8 Componente de imagem no canvas | [#71](https://github.com/Geracao-Zine/geracao-zine/issues/71) | M | 9.4, 7.2 | Reaproveita 7.1 a 7.5 dentro do editor livre. |
| 9.9 Componente de traço e arco | [#69](https://github.com/Geracao-Zine/geracao-zine/issues/69) | P | 9.3 | Linha, retângulo e arco com espessura e cor. Serve de divisória e de moldura. |
| 9.10 Componente de arquivo | [#74](https://github.com/Geracao-Zine/geracao-zine/issues/74) | M | 9.3 | Ver "Decisões pendentes": no papel, arquivo anexado não existe. A entrega imprimível é um QR code com link; o anexo real só faz sentido no PDF lido na tela. |
| 9.11 Avisos de área segura e sobreposição | [#72](https://github.com/Geracao-Zine/geracao-zine/issues/72) | M | 9.4 | Elemento fora da margem de segurança ou texto que estoura o bloco viram pendência na revisão, no mesmo `draftIssues` de hoje. |
| 9.12 Persistir e versionar o layout | [#73](https://github.com/Geracao-Zine/geracao-zine/issues/73) | M | 9.1, 8.1 | O layout personalizado entra no JSON do rascunho e do zine, com versão de schema. |
| 9.13 Biblioteca de blocos do usuário | [#75](https://github.com/Geracao-Zine/geracao-zine/issues/75) | G | 9.2, 8.3 | Salvar um bloco composto e reutilizar em outro zine. Depende da conta da Fase 8. |

Ordem sugerida: 9.1 → 9.2 → 9.3 → 9.4 → 9.7 → 9.5 → 9.9 → 9.6 → 9.8 → 9.11 → 9.12 → 9.10 → 9.13.

Riscos: 9.1 é a tarefa de maior risco do roadmap inteiro, porque mexe no motor que hoje garante a paridade entre preview e PDF. Ela precisa entrar sozinha, com comportamento idêntico e sem nenhuma funcionalidade nova junto. 9.4 é a maior em esforço e a que mais muda de ideia durante a execução — convém prototipar antes de fechar escopo.

**Conclusão:** o autor escolhe entre partir de um template pronto ou de uma página em branco, adiciona blocos de título, texto, imagem, traço e arquivo, posiciona e redimensiona livremente, e o PDF sai igual ao que estava na tela — nas doze dobras, sem exceção.

### Decisões pendentes

Três decisões travam itens específicos e não devem ser tomadas por quem implementa sozinho:

1. **Onde ficam os bytes das imagens** (7.3): volume Docker com backup, ou storage S3-compatível. Volume é mais simples e mais frágil — some junto com a VPS. S3-compatível custa configuração e uma dependência nova.
2. **O que "arquivo" significa impresso** (9.10): anexo de PDF não sobrevive ao papel. A saída honesta é QR code com link no impresso e anexo no PDF digital, deixando claro para o autor que são coisas diferentes.
3. **Conteúdo público e responsabilidade** (8.9): abrir a biblioteca pública sem regra de remoção e sem termo de uso cria obrigação jurídica que o projeto ainda não tem.

### Ordem entre os eixos

A fundação (9.1) vem primeiro, sozinha. Depois, a ordem recomendada é **8 → 7 → 9**, e não a ordem numérica:

- A Fase 8 é a única que resolve um problema que já dói hoje, que é perder o zine ao trocar de navegador. Ela não depende de 9.1.
- A Fase 7 entrega valor visível com pouco risco depois de 9.1.
- O resto da Fase 9 é o maior esforço e o mais aberto a mudança de escopo; entrar por último evita refazer interface sobre um modelo que ainda vai mudar.

---

## Backlog contínuo

- [x] Testes automatizados do motor de diagramação (quebra de linha, ajuste de fonte, imposição por dobra). Feito: 340 testes em `node:test`, incluindo `templates`, `folds`, `print-marks`, `print-mode`, `panel-layout`, `font-fit` e `preview-parity`.
- [ ] CI no GitHub Actions: lint, typecheck, build e testes em cada PR. É o item que mais barato fica agora: a suíte já roda sem banco, com 2 testes pulando quando falta `DATABASE_URL`.
- [ ] `AGENTS.md` com as convenções do projeto para contribuições assistidas. Parcial: o arquivo existe, mas só com o bloco que o `next dev` gera. As convenções de produto estão no README e ainda não foram levadas para lá.
- [ ] Biblioteca com zines reais publicados (hoje é placeholder). Depende da Fase 8.
- [ ] Página de apoio com meios de contribuição (hoje é placeholder).
- [ ] Internacionalização, se houver demanda.
- [ ] Acessibilidade auditada com leitor de tela. A Fase 9 acrescenta o texto alternativo das imagens (7.9), que é pré-requisito.
- [ ] Debounce na gravação do rascunho (era 4.5): hoje `localStorage` é escrito a cada tecla. Vira requisito de 8.3, quando a gravação passar a ir para o servidor.

## Convenções de código

- TypeScript estrito, sem `any`, com tipos de retorno explícitos em funções exportadas.
- Ponto e vírgula ao final de cada linha de comando.
- Uma responsabilidade por arquivo; regra de negócio não mora em componente de tela.
- Constantes de diagramação em um único módulo; nenhum número mágico espalhado.
- Nomes descritivos em português para domínio do produto, inglês para infraestrutura e API.

## Definition of Done

Uma tarefa só é considerada concluída quando:

1. `npm run lint`, `npm run typecheck` e `npm run build` passam.
2. O comportamento foi verificado manualmente no fluxo real.
3. Não introduz `any`, `console.log` ou número mágico novo.
4. Quando afeta diagramação, foi validada com impressão física.
5. Este roadmap foi atualizado.

## Issues no GitHub

Cada tarefa abaixo existe como issue no repositório, agrupada por milestone de fase. As issues são a fonte de verdade do andamento; este documento explica o **porquê** de cada fase e da ordem.

### Como funciona a automação

O label `openhands` marca a issue para ser capturada e processada automaticamente: ao ser aplicado, o OpenHands comenta na issue, cria uma branch, implementa e abre o pull request.

Alternativa: um comentário começando com `@openhands` na issue ou no PR também dispara o trabalho, com o mesmo efeito. Serve para retomar uma issue depois de um PR malsucedido, sem mexer nos labels.

O label `blocked` significa que a issue ainda não deve ser capturada, porque depende de outra ser mergeada primeiro. Quando a dependência entra na `master`, remova `blocked` e adicione `openhands`.

O label `next-up` marca a issue que já está liberada por dependência, mas ainda não foi armada. Serve de fila: a issue está pronta para receber `openhands` na ordem indicada abaixo, sem que ninguém precise recalcular o grafo. Trocar `next-up` por `openhands` é o único passo necessário para iniciar o trabalho.

Para pedir uma segunda tentativa em uma issue já processada, remova e reaplique o label: isso abre uma nova branch e um novo PR, sem sobrescrever o anterior.

### Estado das issues

| Fase | Issues | Situação |
|---|---|---|
| 1 — Node e dependências | #3, #4, #5, #6 | fase concluída: #3, #4, #5 e #6 entregues |
| 2 — Docker e VPS | #7, #8, #9 | fase concluída: #7, #8 e #9 entregues |
| 3 — Bugs | #10, #11, #12, #13, #14, #15, #16 | #10, #11, #12, #13, #14, #15 e #16 entregues |
| 4 — Otimização | #17, #18 | #17 entregue; #18 fechada (o problema não existia) |
| 5 — Padronização | #19, #20, #21 | fase concluída: #19, #20 e #21 entregues |
| 6 — Fluxo e diagramação | #22 a #29 | fase concluída: #22 a #29 entregues |
| 7 — Imagem | #46 a #54 | aberta: #46 armada; #47 a #54 bloqueadas |
| 8 — Conta e biblioteca | #45, #55 a #63 | aberta: #45 armada; #55 a #63 bloqueadas |
| 9 — Layout livre | #44, #64 a #75 | aberta: #44 armada; #64 a #75 bloqueadas |

Fechadas: #3 (lint), #4 (versão do Node), #5 (dependências e audit), #6 (`jspdf` removido), #7 (Dockerfile multi-stage), #8 (docker-compose e `.env.example`), #9 (deploy em VPS), #10 (navbar), #11 (modelo de dados do editor), #12 (quebra de palavra no PDF), #13 (imports mortos), #14 (data da capa), #15 (fonte do PDF), #16 (navbar e fonte do body), #17 (pdf-lib dinâmica), #18 (memoização — premissa inválida), #19 (regras de lint), #20 (camadas), #21 (constantes de diagramação), #22 (fluxo em etapas), #23 (modelo de página), #24 (auto-ajuste de fonte), #25 (templates T1 a T4), #26 (minizine e grampeado), #27 (trifold, Z, acordeão, gatefold e 16 páginas), #28 (frente e verso espelhado), #29 (marcas e margem de segurança).

### Fila de execução

**Vazia.** Todas as issues que chegaram a receber `next-up` foram fechadas, na ordem #8 → #6 → #21 → #19 → #9. A ordem foi escolhida para evitar conflito de merge, já que cada uma mexe em arquivos que a seguinte também altera.

A #16 (feita) ficou antes de tudo porque só tocava `layout.tsx`, `globals.css` e a navbar — não encostava em nada que a #20 acabou de mover.

A #14 foi feita logo depois da #20 porque mexia em três camadas em vez de duas: a data deixou de ser `useState` dentro do editor e passou a viver no domínio da capa, com o hook e a página consumindo. Fazer isso com a divisão da #20 recém-definida evitou reaprender o mapa dos arquivos.

A #21 veio depois da #20 por depender do `src/domain` já separado. As constantes ficaram em `src/lib/pdf/layout.ts`, e não em `src/domain`: `src/domain` já importa de `src/lib`, então mover as medidas para lá criaria a dependência inversa `lib → domain → lib`.

A #19 ficou por último de propósito: ao exigir ponto e vírgula em todo o `src/`, ela reformataria os arquivos que as anteriores escrevem. Na prática o código já estava conforme — ligar as regras não exigiu uma única correção —, mas a ordem evitou o risco.

A #22 (fluxo em etapas) ficou para depois da fila acima: é funcionalidade nova e grande, e convém que o modelo de data e capa já esteja estável (a #14 fechou isso) antes de o cadastro virar etapas. Foi entregue pelo PR #36, com o cadastro em quatro etapas e rascunho em `localStorage`.

### Grafo de dependências

```
FECHADAS
  #3 lint ──> #4 node ──> #5 deps ──> #6 jspdf
  #10 navbar ──> #16 navbar/body
  #11 modelo editor ──> #12 wrapText
  #17 pdf dinamico ──> #20 camadas ──> #21 constantes
  #14 data da capa  (dependia de #20)
  #7 dockerfile ──> #8 compose ──> #9 deploy
  #20 + #11 ──> #22 fluxo etapas ──> #23 pagina zine ──> #24 auto-fonte
  #24 ──> #25 T1-T4 ──┬─> #26 T5,T11 ──> #27 T6-T10,T12
                      └─> #28 frente/verso

ABERTAS (numero da issue entre parenteses)

  Fundacao (independente, mas pre-requisito de 7.2 e de 9.2 em diante)
    #44 9.1 representacao posicionada

  Fase 7 — Imagem
    #46 7.1 modelo de imagem (independente)
      ├─> #49 7.3 upload ──> #53 7.8 limites
      └─> #54 7.9 texto alternativo
    #44 ──> #47 7.2 imagem no PDF
      ├─> #48 7.6 capa
      ├─> #52 7.7 aviso de dpi
      └─> com #49 ──> #50 7.4 escala ──> #51 7.5 recorte

  Fase 8 — Conta e biblioteca (nao depende de #44)
    #45 8.1 modelo Zine
      ├─> #55 8.2 API
      │     ├─> #56 8.3 salvar na conta ──┬─> #58 8.7 publico/privado
      │     │                             └─> #59 8.4 migrar rascunho
      │     └─> #57 8.5 meus zines
      └─> #60 8.6 biblioteca publica ──┬─> #62 8.10 pagina publica
                                       └─> #63 8.9 moderacao
    #57 + #60 ──> #61 8.8 reaproveitar

  Fase 9 — Layout livre
    #44 ──┬─> #70 9.6 templates prontos
          └─> #64 9.2 texto ──> #65 9.3 renderizador
                                  ├─> #69 9.9 formas
                                  ├─> #74 9.10 arquivo
                                  └─> #66 9.4 canvas
                                        ├─> #67 9.5 ordem
                                        ├─> #68 9.7 pagina em branco
                                        ├─> #71 9.8 imagem (com #47)
                                        └─> #72 9.11 area segura

  Cruzamentos entre eixos
    #44 + #45 ──> #73 9.12 persistir layout
    #64 + #56 ──> #75 9.13 blocos reutilizaveis
```

### Ordem prática de trabalho

1. **Fila vazia.** As issues que receberam `next-up` foram todas fechadas, na ordem #8 → #6 → #21 → #19 → #9.
2. **Fase 6 encerrada:** #22 a #29 entregues. Restam nela só dois itens que não são código — a #6.3.6 (validação com impressão física) e a #6.4.4 (nome do arquivo por título), que ainda não virou issue.
3. **Fases 7, 8 e 9 abertas:** milestones e 32 issues criados. Três estão armadas com `next-up`, uma por frente paralela — #44 (fundação), #45 (modelo `Zine`) e #46 (modelo de imagem). As demais seguem `blocked` de propósito. Ainda falta resolver as três decisões pendentes: sem a de armazenamento, a #49 não deve ser armada; sem a de conteúdo público, a #63 também não.
4. **Primeira issue dos três eixos:** 9.1, a fundação. Ela entra sozinha, sem funcionalidade nova e com os testes atuais como rede de segurança. Fazer 7.2 ou 9.2 antes dela significa implementar duas vezes.

### Por que a fundação vem antes, mesmo não sendo o pedido mais visível

O pedido dos três eixos parece três pedidos independentes, e em termos de produto são. Em termos de código, não: hoje uma página é `{ title, subtitle, date, body }`, e `layoutPanel` transforma esses quatro campos em linhas posicionadas por um algoritmo fixo. Não existe, em lugar nenhum, a noção de "um bloco nesta coordenada".

Imagem precisa disso (7.1 descreve posição e escala). O editor livre precisa disso de forma ainda mais direta (9.2 em diante). Sem a representação posicionada, cada eixo inventaria a sua própria estrutura de página, e as três convergiriam depois por reescrita — o caminho mais caro possível.

A conta e a biblioteca (Fase 8) são a exceção: elas guardam o que já existe, e por isso podem andar em paralelo à fundação ou mesmo antes dela. É o eixo que resolve a dor mais imediata, que é perder o zine ao trocar de navegador.
