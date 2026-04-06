# ── Stage 1: Install ALL deps (for building) ──────────────────────
FROM node:22-alpine AS all-deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Stage 2: Install PRODUCTION deps only ─────────────────────────
FROM node:22-alpine AS prod-deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 3: Build Next.js ─────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=all-deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (outputs to src/generated/prisma)
RUN npx prisma generate

# NEXT_PUBLIC_* ต้องมีตอน build เพราะถูก bake เข้า JS bundle
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_LIFF_ID
ARG NEXT_PUBLIC_UPLOAD_IMAGE_HOSTNAME
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_LIFF_ID=$NEXT_PUBLIC_LIFF_ID
ENV NEXT_PUBLIC_UPLOAD_IMAGE_HOSTNAME=$NEXT_PUBLIC_UPLOAD_IMAGE_HOSTNAME

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 4: Production runner ─────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Production node_modules (no devDeps)
COPY --from=prod-deps /app/node_modules ./node_modules

# Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Static files
COPY --from=builder /app/public ./public

# Prisma: schema + migrations (needed for `prisma migrate deploy`)
COPY --from=builder /app/prisma ./prisma

# prisma.config.ts — บอก Prisma ว่า DATABASE_URL อยู่ที่ไหน
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Generated Prisma client (imported by the app at runtime)
COPY --from=builder /app/src/generated ./src/generated

# Next.js config and package.json (needed by `next start`)
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json   ./package.json

# Entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node_modules/.bin/next", "start"]
