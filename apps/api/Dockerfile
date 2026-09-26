# syntax=docker/dockerfile:1
# Images de l'API, à construire depuis la racine du dépôt :
#   docker build -f apps/api/Dockerfile -t fondamentalplugin-api .                    # API
#   docker build -f apps/api/Dockerfile --target migrate -t fondamentalplugin-api-migrate .
#     → applique les migrations Prisma puis s'arrête (lancée à chaque déploiement)

# ─── Manifestes ─────────────────────────────────────────────────
# Chaque espace de travail doit être listé, sinon `npm ci` refuse le lockfile.
FROM node:22-alpine AS manifests
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# ─── Build ──────────────────────────────────────────────────────
FROM manifests AS build
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
RUN npm ci
COPY . .
RUN npm run build -w @fondamental/api

# ─── Migrations : outils de build + CLI Prisma, exécution ponctuelle ─
FROM build AS migrate
WORKDIR /app/apps/api
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ─── Dépendances de production uniquement ───────────────────────
# --omit=optional --omit=peer : la CLI Prisma (~300 Mo) est une dépendance « peer »
# optionnelle de @prisma/client, que npm installe sinon. Elle ne sert qu'aux migrations.
FROM manifests AS prod-deps
RUN npm ci --omit=dev --omit=optional --omit=peer -w @fondamental/api --include-workspace-root=false \
 && npm cache clean --force

# ─── Image finale : utilisateur non root, sans outils de build ──
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000
ARG APP_VERSION=local
ENV APP_VERSION=$APP_VERSION

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/api/package.json ./apps/api/
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1
CMD ["node", "dist/main.js"]
