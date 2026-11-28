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


