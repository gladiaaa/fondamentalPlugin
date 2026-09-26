# Fondamental Plugin : boutique

Site de vente des plugins Minecraft **Fondamental** : FondamentalBedwars, FondamentalTag et FondamentalCrate.

Pour le client : il choisit un plugin, paie avec Stripe, puis reçoit immédiatement sa **clé de licence Premium**, à l'écran et par e-mail. Il colle cette clé dans le `config.yml` du plugin, et le plugin passe en Premium.

## Stack

| Rôle | Outil |
|---|---|
| Site | [Next.js 16](https://nextjs.org) (App Router) + TypeScript |
| Style | Tailwind CSS 4 |
| API | [NestJS 12](https://nestjs.com) (ESM) + TypeScript, servie sous `/api` |
| Base de données | PostgreSQL 17 dédié + [Prisma 7](https://www.prisma.io) |
| Paiement | [Stripe Checkout](https://stripe.com/docs/payments/checkout) |
| Licences | `license-server` Fondamental (API admin, clés signées Ed25519) |
| E-mails | [Resend](https://resend.com) (optionnel) |

## Organisation du dépôt

Monorepo npm (workspaces) :

| Dossier | Contenu |
|---|---|
| `apps/web` | Le site : Next.js (`@fondamental/web`) |
| `apps/api` | L'API : NestJS (`@fondamental/api`) |
| `packages/shared` | Types partagés entre le site et l'API (`@fondamental/shared`) |

Les dépendances s'installent **une seule fois, à la racine**. Pour ajouter un paquet à un espace : `npm install <paquet> -w @fondamental/web`.

## Démarrer

```bash
npm install
cp .env.example apps/web/.env.local   # puis remplir les valeurs
npm run dev                           # site sur http://localhost:3000
```

### API

Prérequis : Docker, pour la base PostgreSQL locale.

```bash
docker compose -f compose.dev.yml up -d        # base PostgreSQL locale
cp apps/api/.env.example apps/api/.env
npm run dev -w @fondamental/api                # API sur http://localhost:4000/api
```

- Santé : http://localhost:4000/api/health
- Documentation interactive (Swagger) : http://localhost:4000/api/docs (jamais en production)
- Tests : `npm run test -w @fondamental/api` (unitaires), `npm run test:e2e -w @fondamental/api` (contre la base locale, `DATABASE_URL` exportée)
- Migrations : `npm run db:migrate -w @fondamental/api` (création en local), `db:deploy` (application)

Paiements en local : utiliser les **clés de test** Stripe et relayer les webhooks avec la [CLI Stripe](https://stripe.com/docs/stripe-cli) :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Scripts

À lancer depuis la racine : chaque commande s'applique à tous les espaces de travail.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement du site |
| `npm run build` | Build de production |
| `npm run lint` | ESLint (site), oxlint (API) |
| `npm run typecheck` | Vérification des types |
| `npm run test` | Tests unitaires |

## Variables d'environnement

Site : [`.env.example`](.env.example). API : [`apps/api/.env.example`](apps/api/.env.example). Aucun secret ne doit être commité : `.env` et `.env.local` sont ignorés par Git.

## Environnements

| Environnement | Branche | Adresse |
|---|---|---|
| Développement | `dev` (par défaut) | https://dev.fondamentalplugin.fr |
| Production | `prod` | https://fondamentalplugin.fr |

Chaque push sur `dev` ou `prod` construit l'image Docker et la déploie automatiquement, avec retour à la version précédente si le site ne répond pas : voir [deploy/README.md](deploy/README.md).

```bash
docker build -f apps/web/Dockerfile -t fondamentalplugin .
docker run --rm -p 3000:3000 fondamentalplugin   # http://localhost:3000

docker build -f apps/api/Dockerfile -t fondamentalplugin-api .                     # API
docker build -f apps/api/Dockerfile --target migrate -t fondamentalplugin-api-migrate .  # migrations
```

Le déploiement de l'API sur le VPS arrive avec #15.

## Travailler sur le projet

Tout passe par des issues, des branches et des pull requests vers `dev` ; `prod` ne reçoit que des PR depuis `dev`. Voir [CONTRIBUTING.md](CONTRIBUTING.md).
