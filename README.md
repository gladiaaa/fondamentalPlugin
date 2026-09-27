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
- Contrat de l'API pour le site : [`apps/api/openapi.json`](apps/api/openapi.json) (à régénérer avec `npm run openapi -w @fondamental/api` quand une route change) et le guide [`docs/api-front.md`](docs/api-front.md)
- Tests : `npm run test -w @fondamental/api` (unitaires), `npm run test:e2e -w @fondamental/api` (contre la base locale, `DATABASE_URL` exportée)
- Migrations : `npm run db:migrate -w @fondamental/api` (création en local), `db:deploy` (application)

### Comptes et authentification (API)

Inscription et connexion par e-mail et mot de passe. Toutes les routes sont sous `/api/auth` (détail et schémas dans Swagger et `openapi.json`).

| Route | Rôle |
|---|---|
| `POST /register` `{email, password}` | Crée le compte et envoie le lien de confirmation. Réponse **identique** que l'adresse existe déjà ou non |
| `POST /verify-email` `{token}` | Confirme l'adresse (lien valable 24 h, à usage unique) |
| `POST /resend-verification` `{email}` | Renvoie le lien (délai minimal d'une minute) |
| `POST /login` `{email, password}` | Ouvre la session : cookie + `{ user, csrfToken }`. **Refusé tant que l'adresse n'est pas confirmée** (403, `code: "EMAIL_NOT_VERIFIED"`) |
| `GET /me` | Le compte connecté et son `csrfToken` (à appeler au chargement du site) |
| `POST /logout`, `POST /logout-all` | Ferme la session / toutes les sessions du compte |
| `POST /forgot-password` `{email}` | Envoie un lien de réinitialisation (valable 30 min, à usage unique) |
| `POST /reset-password` `{token, password}` | Nouveau mot de passe : ferme toutes les sessions, débloque le compte, confirme l'adresse |
| `POST /change-password` `{currentPassword, newPassword}` | Connecté : change le mot de passe, ferme les *autres* sessions |

Règles : mot de passe de 10 à 128 caractères, refusé s'il figure dans une fuite connue (Have I Been Pwned, en k-anonymat) ; compte bloqué 15 min après 5 échecs ; limites de requêtes par IP sur chaque route sensible.

**Ce que le site doit faire**

- Les requêtes vont vers `/api/...` **sur le même domaine que le site**, avec les cookies (`fetch(..., { credentials: 'same-origin' })`). Le cookie de session est `HttpOnly` : le JavaScript ne le lit pas.
- Toute requête qui **modifie** des données (POST, PUT, PATCH, DELETE) doit envoyer l'en-tête **`X-CSRF-Token`** avec le `csrfToken` reçu à la connexion ou par `GET /me`. Les routes d'inscription, de connexion et de réinitialisation, qui n'ont pas de session, n'en ont pas besoin, mais l'API refuse toute requête sans `Origin` du site.
- Les liens des e-mails pointent vers des **pages du site**, pas vers l'API : `/verifier-email?token=…` et `/reinitialiser-mot-de-passe?token=…`. Ces pages lisent le jeton puis appellent `POST /api/auth/verify-email` ou `reset-password`. Elles doivent envoyer `Referrer-Policy: no-referrer` et retirer le jeton de l'URL après lecture (`history.replaceState`).
- En développement local, le site (`:3000`) et l'API (`:4000`) sont sur deux ports : faire relayer `/api/*` par le serveur de développement du site (rewrite Next.js), pour rester « sur le même domaine ».

**Protéger une route de l'API** : `@UseGuards(SessionGuard)` et `@Auth()` pour récupérer le compte. Le contrôle d'origine est global ; un appel de serveur à serveur (webhook Stripe) doit porter `@SkipOriginCheck()` et s'authentifier autrement (signature).

**En local**, sans `RESEND_API_KEY`, les e-mails sont affichés dans les logs de l'API : c'est là qu'on trouve le lien de confirmation.

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


## Travailler sur le projet

**Documentation** : [architecture](docs/architecture.md), [décisions](docs/adr/README.md), [runbook](docs/runbook.md) (déployer, revenir en arrière, restaurer, changer un secret), [contrat de l'API pour le site](docs/api-front.md), [publier une version d'un plugin](docs/release-plugin.md).

Tout passe par des issues, des branches et des pull requests vers `dev` ; `prod` ne reçoit que des PR depuis `dev`. Voir [CONTRIBUTING.md](CONTRIBUTING.md).
