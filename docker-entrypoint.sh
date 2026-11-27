#!/bin/sh
# Aplica as migrations antes de servir. Sem isso o banco sobe vazio e a primeira
# consulta falha com "relation does not exist".
set -e

APP_DIR="${APP_DIR:-/app}"
MIGRATE_DIR="${MIGRATE_DIR:-$APP_DIR/migrate}"
TENTATIVAS="${MIGRATE_TENTATIVAS:-5}"

if [ -z "$DATABASE_URL" ]; then
	echo "DATABASE_URL ausente: migrations ignoradas." >&2
else
	echo "Aplicando migrations..."
	cd "$MIGRATE_DIR"

	# O Postgres e um recurso separado no Coolify e pode ainda nao aceitar
	# conexoes quando este container sobe. Insistir evita que o deploy falhe
	# por alguns segundos de diferenca.
	n=1
	until ./node_modules/.bin/prisma migrate deploy; do
		if [ "$n" -ge "$TENTATIVAS" ]; then
			echo "Migrations falharam apos $TENTATIVAS tentativas." >&2
			exit 1
		fi
		echo "Tentativa $n falhou; repetindo em 3s..." >&2
		n=$((n + 1))
		sleep 3
	done

	cd "$APP_DIR"
fi

# exec para o node virar o PID 1 e receber SIGTERM do Docker no restart.
exec node server.js
