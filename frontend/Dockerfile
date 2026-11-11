# ── Stage 1 : build React/Vite ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build de production (tsc + vite build)
RUN npm run build

# ── Stage 2 : servir avec Nginx ──────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

# Copier le build dans le répertoire de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copier la config Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
