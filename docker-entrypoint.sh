#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ช่วงเวลาคาเฟ่ — Starting up"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "▶ Running database migrations..."
# ใช้ --schema เพื่อบอก path ตรงๆ และ bypass prisma.config.ts
node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma
echo "✓ Migrations complete"

echo "▶ Starting Next.js..."
exec "$@"
