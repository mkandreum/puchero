# syntax=docker/dockerfile:1.4

# ── 1. Dependencias ───────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm install --no-audit --no-fund

# ── 2. Build (cliente + servidor) ─────────────────────────────
FROM deps AS builder
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

# ── 3. Producción ─────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3000 APP_TZ=Europe/Madrid
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD curl -fs http://localhost:3000/api/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
