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

