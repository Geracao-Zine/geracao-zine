# syntax=docker/dockerfile:1

FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# O postinstall roda `prisma generate`, que precisa do schema. Copiar so o
# schema (e nao o projeto inteiro) mantem o cache desta camada quando o codigo
# muda, que e o que importa para o tempo de build.
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npm ci

FROM node:26-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# O client gerado no estagio deps veio de um COPY anterior e o `COPY . .`
# acima pode sobrescrever src/, entao gerar de novo e barato e garante que o
# client corresponde ao schema atual. O build nao precisa de DATABASE_URL
# porque o singleton do Prisma so conecta no primeiro acesso.
RUN npx prisma generate
RUN npm run build

# O standalone arrasta o typescript do devDependencies (20 MB). Ele nao e
# necessario em runtime, ja que o build gerou JS. Remover aqui, e nao no
# estagio final, evita que os bytes viagem na camada do COPY.
RUN rm -rf .next/standalone/node_modules/typescript

# O CLI do Prisma e necessario em runtime para aplicar as migrations, mas nao
# pode entrar no node_modules do app: o standalone ja tem suas proprias copias
# resolvidas e misturar os dois quebraria a resolucao de modulos. Instalar num
# diretorio separado, e apenas o CLI, evita arrastar o devDependencies inteiro
# do projeto (~900 MB) so para rodar um comando.
FROM node:26-alpine AS migrator
WORKDIR /migrate
RUN npm init -y > /dev/null && npm install --no-audit --no-fund prisma@7.10.1 dotenv@18.0.10
COPY prisma ./prisma
COPY prisma7.config.ts ./

FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
	&& adduser --system --uid 1001 --ingroup nodejs nextjs

# O standalone ja traz o server.js e apenas as dependencias de producao
# resolvidas no build; static e public ficam fora dele e entram a mao.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# O entrypoint aplica as migrations antes de servir. O diretorio fica fora de
# /app para o node_modules do CLI nao competir com o do standalone.
COPY --from=migrator --chown=nextjs:nodejs /migrate /app/migrate
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
