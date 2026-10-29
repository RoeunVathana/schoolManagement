#!/bin/sh

set -e

if [ "${SERVICE_ROLE:-backend}" = "frontend" ]; then
  exec nginx -g "daemon off;"
fi

npx prisma db push --skip-generate
exec node dist/src/main.js
