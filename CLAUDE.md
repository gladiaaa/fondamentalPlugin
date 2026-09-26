# Fondamental Plugin : boutique

Site de vente des plugins Minecraft Fondamental (FondamentalBedwars, FondamentalTag, FondamentalCrate) : paiement Stripe, puis clé de licence Premium générée par le serveur de licences Fondamental.

## Stack

- Monorepo npm workspaces : `apps/web` (site Next.js, `@fondamental/web`), `apps/api` (API NestJS, `@fondamental/api`), `packages/shared` (types partagés, `@fondamental/shared`, livré en TypeScript). Dépendances installées à la racine uniquement ; ajouter un paquet avec `-w <espace>`.
- Next.js 16 (App Router, `output: "standalone"`), React 19, TypeScript, Tailwind CSS 4.
- Docker (image `ghcr.io/gladiaaa/fondamentalplugin`) sur le VPS, derrière nginx.
- Next.js 16 diffère des versions précédentes : `params` et `searchParams` sont des Promise, `middleware` s'appelle `proxy`. En cas de doute, lire la doc dans `node_modules/next/dist/docs/`.

## API (`apps/api`)

- **NestJS 12, ESM uniquement** : imports relatifs avec l'extension `.js` (`import { X } from './x.js'`), `module: nodenext`. Un module par domaine (`src/auth`, `src/orders`…), branché dans `app.module.ts`.
- Toutes les routes sous `/api` (préfixe global). En ligne, nginx envoie **tout `/api/*` à l'API** : le site (`apps/web`) ne doit pas créer de route sous `/api` (sa `/api/health` ne sert qu'au contrôle local de `deploy.sh`).
- Migrations : toujours **compatibles avec la version précédente de l'API** (ajouter d'abord, supprimer dans une version ultérieure), car un retour arrière automatique n'annule pas les migrations. `src/app.setup.ts` applique helmet, `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`), trust proxy et Swagger (hors prod) : il est utilisé par `main.ts` **et** les tests e2e, ne pas dupliquer ces réglages ailleurs.
- Configuration : toute nouvelle variable d'environnement s'ajoute au schéma zod de `src/config/env.ts` et à `apps/api/.env.example`. Lecture via `ConfigService<Env, true>` avec `{ infer: true }`, jamais `process.env` directement.
- Base : **PostgreSQL dédié** via Prisma 7 (`PrismaService`, global). Jamais le MySQL du VPS (Minecraft). Schéma dans `prisma/schema.prisma` ; créer une migration avec `npm run db:migrate -w @fondamental/api -- --name <nom>` et la versionner. Le client est généré dans `src/generated/` (ignoré par Git) avant build, lint, types et tests.
- `@fondamental/shared` : **types uniquement** (`import type`), l'API ne peut pas exécuter son TypeScript.
- Tests Vitest : unitaires `src/**/*.spec.ts` (doublures, aucun service externe), e2e `test/**/*.e2e-spec.ts` (API complète + vraie base, `compose.dev.yml` en local). Toute route a au moins un test e2e ; toute route protégée teste l'accès refusé.
- Logs pino : jamais de mot de passe, jeton, clé de licence ni cookie en clair.

## Commandes

Depuis la racine (chaque commande s'applique à tous les espaces) :

| Commande | Rôle |
|---|---|
| `npm run dev` | site en local sur http://localhost:3000 |
| `npm run dev -w @fondamental/api` | API en local sur http://localhost:4000/api (base : `docker compose -f compose.dev.yml up -d`) |
| `npm run lint` | ESLint (site), oxlint (API) |
| `npm run typecheck` | types |
| `npm run build` | build de production |
| `npm run test` | tests unitaires |
| `npm run test:e2e -w @fondamental/api` | tests e2e de l'API (`DATABASE_URL` vers la base locale) |
| `docker build -f apps/web/Dockerfile -t fondamentalplugin .` | image Docker du site (contexte : racine du dépôt) |
| `docker build -f apps/api/Dockerfile -t fondamentalplugin-api .` | image Docker de l'API (`--target migrate` : migrations) |

Avant de proposer une PR : lint, types, tests et build doivent passer (et les tests e2e si l'API change).

## Git : règles strictes

- **Ne jamais pousser sur `prod`**, ni ouvrir de PR vers `prod` depuis une autre branche que `dev`.
- Toute tâche part d'une **issue** et d'une branche créée depuis `dev` : `feature/<n°>-<sujet>`, `fix/<n°>-<sujet>`, `chore/…`, `docs/…`.
- PR vers `dev` avec `Closes #<n°>` ; fusion en squash. La mise en production est une PR `dev` → `prod` (merge commit), ouverte seulement à la demande d'un humain.
- Pas de force-push sur `dev` ni sur `prod`.
- Commits en français, à l'impératif ou au présent, courts.

## Déploiement

Automatique à chaque push sur `dev` (https://dev.fondamentalplugin.fr) ou `prod` (https://fondamentalplugin.fr) : voir `deploy/README.md`. `/api/health` renvoie la version en ligne. Ne pas modifier `deploy/`, `.github/` ni les `Dockerfile` sans le signaler clairement dans la PR. Un nouvel espace de travail doit aussi être ajouté à l'étape `deps` des `Dockerfile` (copie de son `package.json`), sinon `npm ci` échoue.

## Sécurité

- Aucun secret dans le dépôt, les issues ou les PR (clés Stripe, token du serveur de licences). Seul `.env.example`, sans valeurs, est versionné.
- Stripe en mode test uniquement en local.
- Le token admin du serveur de licences ne doit jamais atteindre le navigateur : appels uniquement côté serveur (Route Handlers, Server Actions).

## Skills du projet

- `/prendre-issue <n°>` : de l'issue à la PR vers `dev`.
- `/release` : prépare la PR `dev` → `prod` avec le résumé des changements.
- `/check-deploy` : vérifie que dev et prod servent la bonne version.
