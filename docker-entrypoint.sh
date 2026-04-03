#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ช่วงเวลาคาเฟ่ — Starting up"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "▶ Running database migrations..."
node_modules/.bin/prisma migrate deploy
echo "✓ Migrations complete"

echo "▶ Starting Next.js..."
exec "$@"
