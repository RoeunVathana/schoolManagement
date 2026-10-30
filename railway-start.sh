#!/bin/sh

set -e

if [ "${SERVICE_ROLE:-backend}" = "frontend" ]; then
  exec nginx -g "daemon off;"
fi

npx prisma db push --skip-generate --accept-data-loss
exec node dist/src/main.js
