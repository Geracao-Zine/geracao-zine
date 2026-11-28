<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Deploy

O `Dockerfile` tem quatro estagios: `deps`, `builder`, `migrator` e `runner`. O
`migrator` existe porque o CLI do Prisma so e necessario para aplicar as
migrations, mas nao pode entrar no `node_modules` do app: o standalone ja tem
suas proprias copias resolvidas e misturar as duas arvores quebra a resolucao.
Ele instala so `prisma` e `dotenv`, em `/migrate`, e esse diretorio e copiado
para `/app/migrate` na imagem final.

O `docker-entrypoint.sh` roda `prisma migrate deploy` antes de `node server.js`.
Consequencias praticas:

- Deploy em banco vazio cria as tabelas sozinho. Sem isso a primeira consulta
  falha com `relation "zines" does not exist`.
- Se as migrations falharem apos `MIGRATE_TENTATIVAS` (padrao 5), o container
  sai com codigo 1 e nao sobe o servidor. Preferimos falhar alto a servir uma
  app que responderia 500 em toda rota de dados.
- Sem `DATABASE_URL` as migrations sao puladas e o servidor sobe mesmo assim.
- O CLI roda como o usuario `nextjs`, entao o diretorio copiado precisa manter
  permissao de leitura e execucao.

## Login com Google

O fluxo tem dois pontos de espera, e cada um tem prazo proprio:

- **Script do GIS** (`src/lib/auth/gis.ts`, `GIS_TIMEOUT_MS`): se o
  `accounts.google.com/gsi/client` for bloqueado por extensao, proxy ou rede, a
  promessa nunca resolveria e o botao ficaria inutilizavel. No timeout o script e
  removido do DOM e a promessa memorizada e liberada, para que um novo clique
  tente de novo.
- **POST /api/auth/google** (`src/lib/auth/client.ts`, `LOGIN_TIMEOUT_MS`): um
  servidor que aceita a conexao e nao responde deixaria o botao em "Entrando…"
  para sempre.

O relogio do carregador do GIS e injetavel, seguindo `src/lib/debounce.ts`, para
os testes nao esperarem tempo real. No client o prazo vem de
`AbortSignal.timeout`, que degrada para "sem prazo" em navegador que nao tem a
API: perder o login inteiro seria pior que perder o prazo.



## Testes de integracao com Postgres

Os arquivos de teste rodam em paralelo contra o mesmo banco. Duas regras
evitam corrida entre eles:

- **Nunca rode duas suites ao mesmo tempo no mesmo banco.** Uma execucao
  concorrente de `npm test` faz o `limpar()` de um arquivo apagar as contas que
  o outro acabou de criar, e a falha aparece como
  `Foreign key constraint violated on the constraint: zines_ownerId_fkey`.
- **Um teste no escopo raiz declarado antes dos hooks quebra a suite.** O
  `after` do escopo dispara assim que o `before` termina, apagando os usuarios
  recem-criados. Testes que nao usam o banco (ex.: 401 sem sessao) ficam no fim
  do arquivo, depois dos hooks.
- A listagem publica e global: assercoes sobre ela devem filtrar pelos ids
  criados no proprio teste, nunca comparar a lista inteira.
- **Zine nasce privado.** `visibility` tem `@default(private)` no schema e
  `newZineFrom` repete o padrao. Teste que precisa de um zine visivel a outra
  pessoa deve dizer `visibility: "public"` — sem isso ele some da listagem
  publica e a falha aparece longe da causa.
- A listagem publica exige `?scope=public`. Sem o escopo, `GET /api/zines`
  devolve os zines do dono da sessao, e nao a biblioteca.
- **O id do zine criado vai para a URL.** `useZineEditor` grava `?zine=<id>`
  com `history.replaceState` assim que o primeiro salvamento cria o zine. Sem
  isso, recarregar a pagina voltava a "rascunho local" e o salvamento seguinte
  criava outro zine para o mesmo texto — a origem das duplicatas na aba "Meus
  zines". Como a URL passa a apontar para o zine recem-criado, o efeito de
  abertura precisa ignorar `zineId === conta.zineId`; buscar de novo
  sobrescreveria o rascunho em digitacao pela copia do banco.
- **PATCH em zine apagado recria.** `atualizarZineNaConta` responde 404 com
  `zine_nao_encontrado` quando o zine sumiu (apagado em outra aba) e, nesse
  caso, faz um POST em vez de devolver erro. Outros erros nao viram zine novo.
- O seletor de visibilidade mostra estado ("Privado"/"Publico"), nao acao.
  "Divulgar" como valor selecionado de um zine ja publico confundia.
- A barra de secoes da biblioteca (`src/components/LibraryNav`) e um bottom nav
  no celular: `fixed inset-x-0 bottom-0` ate `md`, onde vira peca estatica acima
  da lista. **A pagina precisa reservar espaco no rodape** (`pb-32 md:pb-20` em
  `Library/page.tsx`); sem isso a barra fixa cobre o ultimo card. O titulo fica
  embaixo do icone (`flex-col`), no padrao de aplicativo movel, e `pb-[env(safe-area-inset-bottom)]`
  evita que a barra encoste na area de gestos do iPhone.
- **`--purple-dark` nao serve como cor de texto no tema escuro.** Sobre
  `#0D0D0D` ele da 2.0:1 de contraste — ilegivel. O token `--purple-light`
  (`#C084FC`, 7.4:1) existe para isso: use `dark:text-[var(--purple-light)]` em
  qualquer acento textual. `--purple` tambem nao passa (3.4:1). Ao conferir cor
  no navegador, lembre que o Chromium devolve `lab(...)` para cores do Tailwind
  v4 — converta para RGB pintando num canvas antes de calcular contraste, senao
  o numero sai errado.
- **`next start` nao serve o build com `output: "standalone"`.** Ele responde as
  rotas, mas os arquivos de `/_next/static` voltam 500 (sem CSS, a pagina parece
  quebrada e as cores computadas saem pretas). Para testar de verdade, copie
  `.next/standalone`, `.next/static` e `public` para um diretorio e rode
  `node server.js`, que e o que o Dockerfile faz.
