#!/bin/sh

set -e

if [ "${SERVICE_ROLE:-backend}" = "frontend" ]; then
  exec nginx -g "daemon off;"
fi

if [ "${DATABASE_MIGRATION_MODE:-migrate}" = "baseline" ]; then
  # The existing production database was created with `prisma db push`.
  # Keep this compatibility mode, but still reconcile newly added tables and
  # columns. Marking every migration as applied without changing the schema
  # leaves new features (such as submission attachments) broken at runtime.
  npx prisma db push --skip-generate
elif [ "${DATABASE_MIGRATION_MODE:-migrate}" = "migrate" ]; then
  npx prisma migrate deploy
else
  # Explicitly opt in to legacy schema push only when the environment requests it.
  npx prisma db push --skip-generate
fi
exec node dist/src/main.js
