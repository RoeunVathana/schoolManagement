#!/bin/sh

set -e

if [ "${SERVICE_ROLE:-backend}" = "frontend" ]; then
  exec nginx -g "daemon off;"
fi

if [ "${DATABASE_MIGRATION_MODE:-push}" = "migrate" ]; then
  npx prisma migrate deploy
else
  # Keep legacy deployments compatible, but never allow an unattended data-loss push.
  npx prisma db push --skip-generate
fi
exec node dist/src/main.js
