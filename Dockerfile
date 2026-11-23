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

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
