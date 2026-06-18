#!/bin/sh
set -e

mkdir -p "$(dirname "${DATABASE_PATH:-/app/data/careersignal.db}")" "${UPLOADS_PATH:-/app/data/uploads}"

if [ -f /app/apps/web/.next/standalone/apps/web/server.js ]; then
  exec node /app/apps/web/.next/standalone/apps/web/server.js
fi

exec pnpm --filter @careersignal/web start
