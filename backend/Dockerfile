# ── Stage 1 : install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2 : production image ───────────────────────────────────────────────
FROM node:20-alpine AS runner

# curl pour le healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copier les modules déjà installés depuis deps
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY src ./src
COPY package.json ./

# Utilisateur non-root pour la sécurité
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "src/index.js"]
