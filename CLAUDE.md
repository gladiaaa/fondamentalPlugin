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
- **Contrat d'API pour le site** : toute route est documentée (`@ApiOperation`, `@ApiResponse`, `@ApiErrors`, `@ApiSession` pour une route protégée ; corps avec `@ApiProperty({ type: … })`, types toujours explicites). Une PR qui ajoute ou change une route régénère `apps/api/openapi.json` (`npm run openapi -w @fondamental/api`, un test e2e échoue sinon) et met à jour `docs/api-front.md`.
- **Routes de serveur à serveur** (publication des versions par la CI des plugins, webhook Stripe) : hors `openapi.json` (`@ApiExcludeController`), `@SkipOriginCheck()`, authentifiées par un jeton comparé en temps constant ou par une signature ; sans le secret configuré, tout est refusé (`docs/release-plugin.md`).
- Logs pino : jamais de mot de passe, jeton, clé de licence ni cookie en clair. Tout nouveau secret qui transite dans une requête s'ajoute à `LOG_REDACT_PATHS` (`src/config/logging.ts`, testé).
- **Authentification** (`src/auth`) : sessions opaques en base (cookie `__Host-session` hors local), jamais de JWT. Protéger une route : `@UseGuards(SessionGuard)` + `@Auth()`, en important `AuthModule`. Sur les requêtes qui modifient des données, l'API exige l'`Origin` du site (`OriginGuard`, global) **et** l'en-tête `X-CSRF-Token` de la session (`SessionGuard`). Un webhook serveur à serveur prend `@SkipOriginCheck()` et vérifie sa signature.
- **Ne jamais renvoyer l'entité `User` telle quelle** (elle contient `passwordHash`) : passer par un type public de `@fondamental/shared`, comme `publicUser` dans `auth.controller.ts`.
- **Ne pas révéler si un compte existe** : les routes qui prennent une adresse (inscription, mot de passe oublié…) répondent pareil dans les deux cas, avec la même durée (hachage toujours calculé, e-mail envoyé sans attendre).
- E-mails : passer par `Mailer` (jamais Resend en direct) ; les tests utilisent `InMemoryMailer` (`test/support/app.ts`) et n'appellent aucun service externe. Les liens envoyés pointent vers des pages du **site** (`SITE_URL`), jamais vers l'API.
- Tests e2e d'authentification : `newBrowser()` donne un client avec ses cookies, son `Origin` et sa propre IP (`X-Forwarded-For`), pour que les limites de requêtes ne se mélangent pas entre tests. Les tests de sécurité doivent échouer quand on casse le code : vérifier en supprimant volontairement la protection testée.

## Site (`apps/web`)

- **Références** : [`docs/front/`](docs/front/README.md) (brief, maquette `maquettes-boutique.html`, charte graphique, rapport d'analyse des 4 plugins) pour le visuel et le contenu ; [`docs/api-front.md`](docs/api-front.md) pour le contrat API (fait foi sur les routes). Feuille de route par phase : issue [#58](https://github.com/gladiaaa/fondamentalPlugin/issues/58).
- **Le back avance en parallèle** : `docs/api-front.md` change de PR en PR (une PR qui ajoute ou change une route le met à jour, cf. section API ci-dessus). Avant de commencer une phase front qui dépend de l'API, `git pull` sur `dev` et relire `docs/api-front.md` **à ce moment-là** — ne jamais coder contre une copie mentale ou un extrait d'une conversation précédente. `docs/front/brief.md` porte le même avertissement pour ses mentions « disponible »/« prévue ».
- **Style** : Tailwind 4, jetons de la charte importés dans `globals.css` (`@theme`), thème sombre par défaut avec variante claire (`next-themes`, sans flash au chargement). Ne pas utiliser de couleur ou d'espacement hors jetons.
- **Comportement accessible** : primitives Radix (Tabs, Switch, Accordion, Dialog…), stylées à la main avec les classes Tailwind du projet — jamais leur propre CSS.
- **Toasts** : `sonner`, pour les retours brefs uniquement (« Clé copiée »…). Les confirmations d'action (libérer une installation, supprimer le compte) restent **dans la page**, jamais `alert`/`confirm`.
- **Formulaires** : `react-hook-form` + `zod`. Erreur de champ affichée en texte sous le champ, jamais seulement en couleur.
- **Wiki** : Fumadocs (MDX), public, couvre les éditions gratuite et Premium.
- **Icônes** : SVG de `docs/front/charte/icones/` importés via SVGR (`currentColor`, trait 2 px).
- **Arborescence** (`apps/web/src/`) :
  ```
  app/                      routes uniquement (page.tsx fins, peu de logique)
  components/ui/            composants génériques (Button, Field, Badge, Switch, CodeBlock…)
  components/layout/        Header, Footer, AccountSidebar…
  features/<domaine>/       plugins, auth, licenses, checkout, config-generator…
  lib/api/                  couche d'accès unique à l'API (adaptateur réel + mocks MSW)
  ```
  Composants en PascalCase, hooks en camelCase préfixés `use`, un composant = un fichier du même nom.
- **Couche d'accès API** (`lib/api/`) : toute donnée passe par là, jamais un `fetch` direct dans un composant. Tant qu'une route n'est pas livrée (voir `docs/api-front.md` §7), elle est simulée avec **MSW**, avec la même forme que la route réelle — retirer le mock sans toucher aux composants une fois la route livrée.
- **Session côté navigateur uniquement** : `GET /auth/me` au chargement (401 = visiteur, pas une erreur à afficher), `csrfToken` gardé **en mémoire** (contexte React), jamais `localStorage` ni une URL. Toute route qui dépend de la session (`/auth/me`, `/me/*`, `/checkout`, `/configs`) s'appelle depuis un composant client, jamais depuis un Server Component (le cookie et l'`Origin` doivent partir tout seuls).
- **Données publiques** (catalogue, fichiers, versions) : peuvent être lues côté serveur (Server Components).
- **Clé de licence** : masquée par défaut à l'affichage (bouton Afficher/Copier), jamais dans une URL (`/compte/licences/[id-interne]`, pas la clé).
- **`apps/web/next.config.ts`** doit relayer `/api/:path*` vers `http://localhost:4000/api/:path*` en local (`rewrites()`) une fois posé par #57 — sans ça l'API n'est pas joignable en développement.

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
