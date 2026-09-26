# syntax=docker/dockerfile:1
# Image du site. À construire depuis la racine du dépôt :
#   docker build -f apps/web/Dockerfile -t fondamentalplugin .

# ─── Dépendances ────────────────────────────────────────────────
# Seuls les package.json : le cache Docker n'est invalidé que si les dépendances changent.
# Chaque espace de travail doit être listé ici, sinon `npm ci` refuse le lockfile.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci

# ─── Build ──────────────────────────────────────────────────────
FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build -w @fondamental/web

# ─── Image finale : serveur autonome, utilisateur non root ──────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
ARG APP_VERSION=local
ENV APP_VERSION=$APP_VERSION

# En monorepo, le serveur autonome reproduit l'arborescence : apps/web/server.js.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
