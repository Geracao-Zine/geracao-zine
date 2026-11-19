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

Levantamento feito no commit `5683f1c`, branch `master`.

**O que funciona**

- Build de produção conclui sem erros (`next build`).
- Verificação de tipos passa (`tsc --noEmit`).
- Rotas existentes: `/`, `/Create`, `/Editor`, `/Library`, `/Support`.
- Geração de PDF no formato "só para ler" (uma poesia por página A4 retrato) com capa, título, autor e data.
- Preview do editor em grid com adição e remoção de páginas.

**O que está quebrado ou incompleto**

| # | Problema | Onde |
|---|---|---|
| B1 | `eslint` não executa: `eslint-config-next` está na versão `0.2.4` (pacote errado), quebra o `import` do `core-web-vitals` | `package.json`, `eslint.config.mjs` |
| B2 | Classes Tailwind inexistentes (`bg-neutro-50`, `text-escuro`, `bg-zinc`, `border-neutro-100`) — a navbar fica sem cor de fundo e sem borda | `src/components/Navbar/index.tsx` |
| B3 | `jspdf` está instalado mas nunca é usado | `package.json` |
| B4 | `concatTransformationMatrix`, `pushGraphicsState` e `popGraphicsState` importados e não usados | `src/app/Editor/page.tsx` |
| B5 | `wrapText` recebe `font: any`, violando a tipagem estrita | `src/app/Editor/page.tsx` |
| B6 | `console.log` de depuração rodando em produção | `src/app/Create/page.tsx` |
| B7 | A data do zine é sempre "hoje" (`Date.now()` no render), não é editável e não persiste | `src/app/Editor/page.tsx` |
| B8 | Fonte escolhida na tela (classe CSS) não é a fonte usada no PDF (Helvetica fixo) — preview e impressão divergem | `Create` + `Editor` |
| B9 | `removePage` remapeia o conteúdo por índice de array; `addPage` usa `prev.length + 1`. Com remoções no meio, conteúdo e numeração podem sair de sincronia | `src/app/Editor/page.tsx` |
| B10 | Página 1 é a capa, mas o conteúdo do usuário começa em 2: o array de páginas e o array de conteúdo usam réguas diferentes | `src/app/Editor/page.tsx` |
| B11 | `wrapText` não trata palavra maior que a largura máxima (estoura a margem) | `src/app/Editor/page.tsx` |
| B12 | Poema que transborda cria página nova no meio do texto, sem repetir título nem indicar continuação | `src/app/Editor/page.tsx` |
| B13 | `--navbar-height` é definido em efeito, mas o layout usa `mt-14` fixo — pode descolar | `layout.tsx` + `Navbar` |
| B14 | `body` força `font-family: Arial`, anulando a fonte Geist carregada | `src/app/globals.css` |
| B15 | `Library` e `Support` são telas estáticas de placeholder | `src/app/Library`, `src/app/Support` |
| B16 | Sem `.nvmrc`, sem `engines`, e `@types/node` em `^20` com Node 24 no ambiente | raiz |
| B17 | Sem testes automatizados e sem CI | — |

**Dependências desatualizadas**

| Pacote | Atual | Disponível |
|---|---|---|
| next | 16.1.6 | 16.4.6 |
| react / react-dom | 19.2.3 | 19.3.1 |
| tailwindcss / @tailwindcss/postcss | 4.2.1 | 4.3.5 |
| eslint | 10.0.2 | 10.15.0 |
| eslint-config-next | 0.2.4 (errado) | 16.4.6 |
| @types/react / @types/react-dom | 19.2.14 / 19.2.3 | 19.3.0 |
| @types/node | 20.19.33 | 26.6.6 |
| react-icons | 5.5.0 | 5.7.0 |
| pdf-lib | 1.17.1 | 1.17.1 (em dia) |
| typescript | 5.9.3 | 7.0.2 (salto maior, tratar à parte) |

---

## Fase 1 — Node e dependências

Objetivo: base reprodutível, lint funcionando e versões alinhadas.

- [ ] 1.1 Fixar a versão do Node com `.nvmrc` (Node 24 LTS) e adicionar `"engines": { "node": ">=22" }` no `package.json`.
- [ ] 1.2 Alinhar `@types/node` com a versão real do runtime (hoje `^20` com Node 24).
- [ ] 1.3 Corrigir `eslint-config-next` de `0.2.4` para `^16.4.6` e validar `npm run lint` (resolve B1).
- [ ] 1.4 Atualizar dependências de patch/minor: `next`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `@types/react`, `@types/react-dom`, `react-icons`, `jspdf`.
- [ ] 1.5 Remover `jspdf` se permanecer sem uso após a Fase 6, ou consolidar a geração de PDF em uma única biblioteca (resolve B3).
- [ ] 1.6 Avaliar `typescript` 7 em tarefa isolada, com build e tipos verdes antes de manter.
- [ ] 1.7 Regenerar `package-lock.json`, verificar `npm ci` do zero e confirmar `build` + `lint` + `tsc --noEmit`.
- [ ] 1.8 Adicionar `npm run typecheck` (`tsc --noEmit`) como script.

**Conclusão:** clone limpo → `npm ci` → `npm run lint`, `npm run typecheck` e `npm run build` passam sem avisos.

## Fase 2 — Docker e hospedagem em VPS

Objetivo: deploy reprodutível em VPS com imagem enxuta.

- [ ] 2.1 `Dockerfile` multi-stage usando `output: "standalone"` no `next.config.ts`: estágio `deps` → `builder` → `runner` (`node:24-alpine`), usuário não-root.
- [ ] 2.2 `.dockerignore` cobrindo `node_modules`, `.next`, `.git`, `*.md`.
- [ ] 2.3 `docker-compose.yml` com serviço da aplicação, porta configurável, `restart: unless-stopped` e healthcheck em `/`.
- [ ] 2.4 Variáveis de ambiente por `.env.example` documentado (sem segredos no repositório).
- [ ] 2.5 Roteiro de deploy na VPS: Nginx como proxy reverso, certificado TLS (Let's Encrypt) e headers de segurança básicos.
- [ ] 2.6 Publicação de imagem (GHCR) e instrução de atualização (`pull` + `up -d`).
- [ ] 2.7 Documentar no README: requisitos, comandos de build/execução e rollback.

**Conclusão:** `docker compose up -d --build` sobe a aplicação em VPS e responde em HTTPS.

## Fase 3 — Caça e correção de bugs

Objetivo: zerar os defeitos conhecidos e evitar regressão.

- [ ] 3.1 Corrigir B2 (classes Tailwind inválidas na navbar).
- [ ] 3.2 Corrigir B4 (imports mortos) e B5 (`any` em `wrapText`).
- [ ] 3.3 Remover B6 (`console.log`) e qualquer log de depuração remanescente.
- [ ] 3.4 Reescrever o modelo de dados do editor para eliminar B9 e B10: uma lista única e estável de páginas com `id`, sendo a capa um item tipado, não um índice mágico.
- [ ] 3.5 Corrigir B11: palavra maior que a largura máxima deve ser quebrada por caractere.
- [ ] 3.6 Corrigir B12: transbordo de poema deve ser controlado (ver Fase 6, ajuste automático de fonte) e, quando ainda assim estourar, gerar continuação identificada.
- [x] 3.7 Corrigir B13 (altura da navbar via variável, sem `mt-14` fixo) e B14 (fonte do `body`). Feito em #16.
- [ ] 3.8 Corrigir B8: a fonte escolhida no cadastro deve valer no preview e no PDF (embutir a fonte no PDF).
- [ ] 3.9 Corrigir B7: data opcional, editável e persistida.
- [ ] 3.10 Revisar estados vazios: nenhuma página, título em branco, texto só com espaços, caractere especial e acentuação no PDF.
- [ ] 3.11 Testar em telas pequenas e com teclado (foco visível, navegação por tab).

**Conclusão:** todos os itens B1–B17 fechados ou reclassificados com justificativa; nenhuma perda de conteúdo ao remover páginas.

## Fase 4 — Otimização

Objetivo: carregar rápido e não desperdiçar trabalho.

- [ ] 4.1 Carregar `pdf-lib` por import dinâmico apenas ao gerar o PDF, reduzindo o bundle inicial do editor.
- [ ] 4.2 Isolar a geração de PDF em módulo puro, sem dependência de React, permitindo execução fora do componente.
- [ ] 4.3 Memoizar cálculos de quebra de linha e medição de texto; evitar recomputar a cada tecla.
- [ ] 4.4 Aplicar `next/image` corretamente nas imagens existentes e revisar o peso dos assets em `src/assets`.
- [ ] 4.5 Debounce na persistência de rascunho.
- [ ] 4.6 Medir com `next build` e Lighthouse; registrar números antes/depois neste documento.

**Conclusão:** bundle inicial do editor reduzido e geração de PDF sem bloquear a interface perceptivelmente.

## Fase 5 — Padronização de código

Objetivo: um único estilo, tipagem explícita e responsabilidades separadas.

- [ ] 5.1 Tipagem explícita: proibir `any`, tipar retornos de função e props; `strict` já está ativo, reforçar com `@typescript-eslint/no-explicit-any` como erro.
- [ ] 5.2 Ponto e vírgula obrigatório ao final das linhas de comando, garantido por regra de lint (`semi`) e aplicado em todo o `src`.
- [x] 5.3 Separar responsabilidades em camadas: `src/domain` (tipos e regras do zine), `src/lib` (quebra de texto, medição, PDF), `src/components` (apresentação), `src/app` (rotas e orquestração). Nenhum componente de tela gera PDF diretamente.
- [x] 5.4 Extrair o estado do editor para um hook (`useZineEditor`). Feito em #20. O cadastro por etapas segue na #22.
- [ ] 5.5 Padronizar nomes: componentes em PascalCase, hooks com prefixo `use`, tipos sem prefixo `I`, constantes em `SCREAMING_SNAKE_CASE`.
- [ ] 5.6 Substituir strings mágicas (medidas A4, margens, tamanhos de fonte) por constantes nomeadas em um único arquivo de configuração de diagramação.
- [ ] 5.7 Centralizar o design system: remover classes arbitrárias repetidas, usar os tokens já definidos em `globals.css`.
- [ ] 5.8 Revisar acessibilidade básica: `label` associado a `input`, `aria-*` nos seletores, contraste.
- [ ] 5.9 Documentar as convenções no README e garantir que o lint as imponha.

**Conclusão:** lint sem exceções, zero `any`, nenhuma regra de diagramação fora de `src/lib`, e um PR de padronização aplicado ao projeto inteiro.

## Fase 6 — Fluxo de criação e diagramação (funcionalidade principal)

Objetivo: o autor cadastra pouco por vez, escolhe a dobra, o sistema diagrama e entrega o PDF pronto para impressão.

### 6.1 Fluxo em etapas curtas

- [ ] 6.1.1 Quebrar o cadastro em etapas com salvamento incremental: (1) capa e autoria, (2) poesias, (3) revisão, (4) dobra e impressão.
- [ ] 6.1.2 Persistir o rascunho localmente entre etapas, permitindo voltar e adaptar sem perder o que já foi escrito.
- [ ] 6.1.3 Permitir adicionar, editar, reordenar e remover poesias a qualquer momento, com confirmação em ações destrutivas.
- [ ] 6.1.4 Exibir progresso e pendências (ex.: "2 poesias sem título", "1 página vazia").
- [ ] 6.1.5 Só liberar a etapa de dobra quando houver conteúdo mínimo válido.

### 6.2 Conteúdo de cada página do zine

Cada página do zine (não a folha A4, e sim o painel diagramado) tem esta composição:

- Título (opcional)
- Subtítulo (opcional)
- Data (opcional)
- Texto principal (obrigatório, com área limitada)

Regras de diagramação:

- [ ] 6.2.1 O texto principal ocupa uma caixa de área fixa definida pela dobra; ele nunca ultrapassa essa caixa.
- [ ] 6.2.2 Ajuste automático de fonte: buscar por bisseção o maior corpo de fonte entre um mínimo e um máximo que faça o texto caber na caixa, respeitando entrelinha proporcional. Se o mínimo ainda não couber, dividir o texto em continuação com indicativo, nunca cortar em silêncio.
- [ ] 6.2.3 Campos opcionais vazios não reservam espaço: a caixa do texto se expande quando título, subtítulo ou data estão ausentes.
- [ ] 6.2.4 Hierarquia tipográfica fixa por painel: título > subtítulo > data > corpo, com proporções definidas em constantes.
- [ ] 6.2.5 Respeitar quebras de linha do autor (estrofe e verso) e hifenizar apenas quando necessário.
- [ ] 6.2.6 Pré-visualização fiel: o mesmo motor de medição alimenta preview e PDF.

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

- [ ] 6.3.1 Implementar T1 a T4 (base pedida), com imposição correta e ordem de leitura validada em impressão real.
- [ ] 6.3.2 Implementar T5 e T11, que já existem como opção desabilitada no seletor.
- [ ] 6.3.3 Implementar T6 a T10 e T12 como alternativas de dobra.
- [ ] 6.3.4 Cada template define quantas poesias cabem e como paginar quando há mais texto que painéis.
- [ ] 6.3.5 Diagrama visual de cada dobra no seletor, mostrando frente, verso e ordem de leitura.
- [ ] 6.3.6 Validar cada template com uma impressão física: dobra, corte, ordem das páginas e legibilidade da margem de segurança.

### 6.4 Impressão e download

- [ ] 6.4.1 Opção de apenas frente, ou frente e verso, com imposição de verso espelhada corretamente.
- [ ] 6.4.2 Marcas de corte e dobra discretas, com margem de segurança configurável.
- [ ] 6.4.3 PDF em A4 real (595×842 pt) ou paisagem quando a dobra exigir, sem reescalonamento na impressão.
- [ ] 6.4.4 Nome do arquivo gerado a partir do título e da data.
- [ ] 6.4.5 Instruções de dobra e montagem incluídas como página final opcional do PDF.

**Conclusão:** o autor completa o fluxo em etapas, escolhe qualquer dobra do catálogo, recebe um PDF que, impresso e dobrado, sai na ordem correta e com o texto sempre dentro da caixa.

---

## Backlog contínuo

- [ ] Testes automatizados do motor de diagramação (quebra de linha, ajuste de fonte, imposição por dobra).
- [ ] CI no GitHub Actions: lint, typecheck, build e testes em cada PR.
- [ ] `AGENTS.md` com as convenções do projeto para contribuições assistidas.
- [ ] Biblioteca com zines reais publicados (hoje é placeholder).
- [ ] Página de apoio com meios de contribuição (hoje é placeholder).
- [ ] Internacionalização, se houver demanda.
- [ ] Acessibilidade auditada com leitor de tela.

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
| 1 — Node e dependências | #3, #4, #5, #6 | #3 e #4 entregues; #5 na fila; #6 bloqueada por #5 |
| 2 — Docker e VPS | #7, #8, #9 | #7 na fila; #8 e #9 bloqueadas em cadeia |
| 3 — Bugs | #10, #11, #12, #13, #14, #15, #16 | #10, #11, #12, #13, #15 e #16 entregues; #14 na fila |
| 4 — Otimização | #17, #18 | #17 entregue; #18 fechada (o problema não existia) |
| 5 — Padronização | #19, #20, #21 | #20 entregue; #19 na fila; #21 destravada |
| 6 — Fluxo e diagramação | #22 a #29 | #22 destravada; #23 a #29 seguem em cadeia |

Fechadas: #3 (lint), #4 (versão do Node), #10 (navbar), #11 (modelo de dados do editor), #12 (quebra de palavra no PDF), #13 (imports mortos), #15 (fonte do PDF), #17 (pdf-lib dinâmica), #18 (memoização — premissa inválida), #20 (camadas), #16 (navbar e fonte do body).

### Fila de execução

As issues abaixo já têm todas as dependências fechadas e receberam `next-up`. A ordem evita conflito de merge, porque cada uma mexe em arquivos que a seguinte também altera.

| Ordem | Issue | Assunto | Arquivos |
|---|---|---|---|
| 1 | #14 | Data opcional e editável | `src/app/Create/page.tsx`, `src/hooks/useZineEditor.ts`, `src/domain/cover.ts` |
| 2 | #7 | Dockerfile multi-stage | `next.config.ts`, `Dockerfile` |
| 3 | #5 | Dependências e vulnerabilidades | `package.json`, `package-lock.json` |
| 4 | #21 | Constantes de diagramação | `src/domain/`, `src/lib/pdf/` |
| 5 | #19 | Regras de lint (`semi`, sem `any`) | `eslint.config.mjs` e todo o `src/` |

A #16 (feita) ficou antes de tudo porque só tocava `layout.tsx`, `globals.css` e a navbar — não encostava em nada que a #20 acabou de mover.

A #14 agora mexe em três camadas em vez de duas: a data deixa de ser `useState` dentro do editor e passa a viver no domínio da capa, com o hook e a página consumindo. Como a #20 acabou de definir essa divisão, fazer a #14 logo depois evita reaprender o mapa dos arquivos.

A #21 vem depois da #20 por dependência real: as constantes de diagramação precisam de um `src/domain` existente para morar.

A #19 fica por último de propósito: ao exigir ponto e vírgula em todo o `src/`, ela reformata os arquivos que as anteriores escrevem. Executá-la antes gera conflito em cada PR seguinte.

A #22 (fluxo em etapas) também está destravada, mas fica para depois da fila acima: é funcionalidade nova e grande, e convém que a #14 já tenha estabilizado o modelo de data e capa antes de o cadastro virar etapas.

### Grafo de dependências

```
FECHADAS
  #3 lint ──> #4 node ──> #5 deps ──> #6 jspdf
  #3 ──> #11 modelo editor ──> #12 wrapText
  #10 navbar ──> #16 navbar/body
  #17 pdf dinamico
  #20 camadas  (dependia de #17)

ABERTAS
  #5 ──> #6
  #7 ──> #8 ──> #9
  #14
  #19 regras lint  (por ultimo: reformata todo o src)
  #20 ──> #21 constantes
  #20 + #11 ──> #22 fluxo etapas
                   │
                   v
              #23 pagina zine
                   │
                   v
              #24 auto-fonte
                   │
                   v
  #25 T1-T4 ──┬─> #26 T5,T11 ──> #27 T6-T10,T12
              └─> #28 frente/verso ──> #29 marcas
```

A #18 saiu do grafo: a medição de texto nunca rodou a cada tecla, então não havia o que memoizar.

### Ordem prática de trabalho

1. **Agora:** #14, #7 — sem dependências entre si. (#16 feita.)
2. **Depois de #7:** #8 → #9 (infraestrutura).
3. **Depois de #5:** #6 (só remove o `jspdf`).
4. **Depois de #20 (feita):** #21 constantes e #22 fluxo em etapas.
5. **Depois de #22:** #23 → #24 → #25 → (#26 → #27) e (#28 → #29).
6. **Por último:** #19, porque reformata todo o `src`.
