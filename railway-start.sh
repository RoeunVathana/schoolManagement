#!/bin/sh

set -e

if [ "${SERVICE_ROLE:-backend}" = "frontend" ]; then
  exec nginx -g "daemon off;"
fi

if [ "${DATABASE_MIGRATION_MODE:-migrate}" = "migrate" ]; then
  npx prisma migrate deploy
else
  # Explicitly opt in to legacy schema push only when the environment requests it.
  npx prisma db push --skip-generate
fi
exec node dist/src/main.js
