#!/bin/sh

set -e

if [ "${SERVICE_ROLE:-backend}" = "frontend" ]; then
  exec nginx -g "daemon off;"
fi

if [ "${DATABASE_MIGRATION_MODE:-migrate}" = "baseline" ]; then
  # The existing production database was created with `prisma db push`.
  # Record the checked-in migrations without executing them, then switch the
  # Railway variable back to `migrate` for all future deployments.
  for migration_dir in prisma/migrations/*; do
    migration_name="$(basename "$migration_dir")"
    npx prisma migrate resolve --applied "$migration_name"
  done
elif [ "${DATABASE_MIGRATION_MODE:-migrate}" = "migrate" ]; then
  npx prisma migrate deploy
else
  # Explicitly opt in to legacy schema push only when the environment requests it.
  npx prisma db push --skip-generate
fi
exec node dist/src/main.js
