#!/bin/sh
set -e

echo "Running Prisma migrations..."
npm run prisma:migrate:all || echo "Migration skipped or already applied."

echo "Starting application..."
exec node dist/apps/api-gateway/main.js