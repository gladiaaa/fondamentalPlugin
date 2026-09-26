# Fondamental Plugin : boutique

Site de vente des plugins Minecraft Fondamental (FondamentalBedwars, FondamentalTag, FondamentalCrate) : paiement Stripe, puis clé de licence Premium générée par le serveur de licences Fondamental.

## Stack

- Monorepo npm workspaces : `apps/web` (site Next.js, `@fondamental/web`), `apps/api` (API NestJS, `@fondamental/api`, à venir), `packages/shared` (types partagés, `@fondamental/shared`, livré en TypeScript). Dépendances installées à la racine uniquement ; ajouter un paquet avec `-w <espace>`.
- Next.js 16 (App Router, `output: "standalone"`), React 19, TypeScript, Tailwind CSS 4.
- Docker (image `ghcr.io/gladiaaa/fondamentalplugin`) sur le VPS, derrière nginx.
- Next.js 16 diffère des versions précédentes : `params` et `searchParams` sont des Promise, `middleware` s'appelle `proxy`. En cas de doute, lire la doc dans `node_modules/next/dist/docs/`.

## Commandes

Depuis la racine (chaque commande s'applique à tous les espaces) :

| Commande | Rôle |
|---|---|
| `npm run dev` | site en local sur http://localhost:3000 |
| `npm run lint` | ESLint |
| `npm run typecheck` | types |
| `npm run build` | build de production |
| `npm run test` | tests |
| `docker build -f apps/web/Dockerfile -t fondamentalplugin .` | image Docker du site (contexte : racine du dépôt) |

Avant de proposer une PR : lint, types et build doivent passer.

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
