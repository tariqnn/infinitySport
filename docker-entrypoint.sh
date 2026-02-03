#!/bin/sh
set -e
# Run migrations (skip if DATABASE_URL not set or migration fails)
if [ -n "$DATABASE_URL" ]; then
  npx prisma migrate deploy --schema=./prisma/schema.prisma || true
fi
exec "$@"
