# Architecture

Ce document explique **comment la boutique est construite** et où chercher quand on modifie quelque chose. Pour installer le projet : [README](../README.md). Pour intervenir en cas de panne : [runbook](runbook.md). Pour le **pourquoi** des choix : [décisions](adr/README.md).

> Les parties marquées **(à venir)** sont décidées mais pas encore codées : elles renvoient à l'issue GitHub qui les réalise.

## Vue d'ensemble

```
Navigateur ─► nginx ─┬─ fondamentalplugin.fr/*      ─► conteneur web  (Next.js)
                     └─ fondamentalplugin.fr/api/*  ─► conteneur api  (NestJS) ─► conteneur db (PostgreSQL)
                                                            │
Stripe ── webhook ─────► /api/stripe/webhook (à venir)      ├─► serveur de licences (existant)
CI des plugins ── jar ─► /api/admin/releases                └─► Resend (e-mails)
```

- **Un seul domaine** pour le site et l'API : pas de CORS, cookies de session « du même site » ([ADR 0004](adr/0004-api-sous-api.md)).
- **Le site n'a aucun secret.** Stripe, le serveur de licences, Resend et la base ne sont connus que de l'API. Le site ne fait qu'afficher et appeler `/api`.
- Deux environnements identiques : **dev** (branche `dev`, https://dev.fondamentalplugin.fr) et **prod** (branche `prod`, https://fondamentalplugin.fr), chacun avec ses trois conteneurs, sa base et ses secrets. Détail du déploiement : [deploy/README.md](../deploy/README.md).
- Le MySQL du VPS est réservé à Minecraft : la boutique a **sa propre base PostgreSQL** ([ADR 0002](adr/0002-postgresql-dedie.md)).

## Dépôt

| Dossier | Rôle |
|---|---|
| `apps/web` | Le site (Next.js 16, App Router, React 19, Tailwind 4) |
| `apps/api` | L'API (NestJS 12, ESM, Prisma 7) |
| `packages/shared` | Types partagés site ↔ API (`import type` uniquement) |
| `deploy/` | Fichiers du VPS : `compose.yml`, `deploy.sh`, sauvegardes, nginx |
| `docs/` | Cette documentation |
| `.github/workflows/` | CI (`ci.yml`), déploiement (`deploy.yml`), garde de la branche `prod` (`prod-source.yml`) |

## Modules de l'API (`apps/api/src`)

Un module par domaine, branché dans `app.module.ts`. Les routes sont toutes sous `/api`.

| Module | Rôle | État |
|---|---|---|
| `health` | `GET /api/health` : version en ligne et état de la base (sert au contrôle après chaque déploiement) | fait |
| `auth` | Comptes : inscription, confirmation d'e-mail, connexion, mot de passe oublié, sessions, protections (CSRF, blocage, limites) ; export et suppression du compte (RGPD) | fait |
| `catalog` | `GET /api/products` : les plugins, leurs prérequis et leur prix | fait |
| `releases` | Versions et jars : liste par version de Minecraft, téléchargement public, publication par la CI (`/api/admin/releases`) | fait |
| `mail` | Envoi d'e-mails derrière une abstraction `Mailer` (Resend en ligne, journal en local, boîte en mémoire dans les tests) | fait, modèles soignés : #26 |
| `prisma` | Accès à la base | fait |
| `common`, `config` | Documentation OpenAPI partagée, variables d'environnement validées au démarrage, logs | fait |
| `licenses` | Client du serveur de licences ; « mes licences » | #22, #25 |
| `orders` | Stripe Checkout et webhook | #23, #24 |
| `configs` | Générateur de `config.yml` réservé aux acheteurs | #30 |
| OAuth (dans `auth`) | Connexion Microsoft, Discord, Google | #18 |
| back-office | Commandes, licences, produits, versions | #32 |

Règles communes (détaillées dans [CLAUDE.md](../CLAUDE.md)) : entrées validées strictement (`whitelist` + `forbidNonWhitelisted`), aucune entité de base renvoyée telle quelle, aucun secret dans les logs, une route protégée = un test « accès refusé », chaque route documentée dans `apps/api/openapi.json`.

## Données (PostgreSQL 17, Prisma)

| Table | Contenu |
|---|---|
| `users` | Adresse (unique), date de confirmation, empreinte argon2id du mot de passe (vide pour un compte OAuth), compteur d'échecs et blocage |
| `sessions` | Jeton **haché**, jeton anti-CSRF, expiration (30 jours) : révocable |
| `email_tokens` | Liens de confirmation et de réinitialisation : jeton **haché**, usage unique, expiration |
| `products` | Les plugins : slug, description, prérequis, prix (nul tant que non fixé), nom côté serveur de licences |
| `minecraft_versions` | Versions de Minecraft, avec un rang de tri calculé depuis le numéro |
| `releases`, `release_files` | Versions d'un plugin et leurs jars (édition, taille, SHA-256, versions de Minecraft couvertes, compteur de téléchargements) |
| `orders`, `licenses` | Commandes Stripe et clés (à venir, #23, #24) |
| `saved_configs`, `oauth_accounts` | Configurations enregistrées (#30) et comptes tiers (#18) (à venir) |

Les migrations sont dans `apps/api/prisma/migrations`, appliquées automatiquement au déploiement. Elles doivent rester **compatibles avec la version précédente** de l'API (retour arrière automatique). Le catalogue est semé **dans une migration** : l'image de déploiement n'exécute que les migrations.

## Sécurité en un coup d'œil

- **Mots de passe** : argon2id ; refusés s'ils figurent dans une fuite connue (Have I Been Pwned, k-anonymat).
- **Sessions** : jeton opaque tiré au hasard, **seule son empreinte est en base** ; cookie `HttpOnly` (`__Host-session` en ligne) ; jamais de JWT.
- **CSRF** : l'API exige l'`Origin` du site sur toute requête qui modifie des données, **et** l'en-tête `X-CSRF-Token` de la session.
- **Anti-énumération** : inscription et « mot de passe oublié » répondent pareil que le compte existe ou non, avec la même durée.
- **Force brute** : limites de requêtes par IP sur chaque route sensible ; compte bloqué 15 minutes après 5 échecs.
- **Routes de serveur à serveur** (publication des versions, webhook Stripe à venir) : hors `openapi.json`, sans contrôle d'`Origin`, protégées par un jeton comparé en temps constant ou une signature ; **sans secret configuré, tout est refusé**.
- **Fichiers** : nom sûr, chemin toujours ramené dans le dossier de stockage, jar contrôlé sans être décompressé, SHA-256 calculé par le serveur.
- **Conteneurs** : utilisateur non-root, système de fichiers de l'API en lecture seule, `no-new-privileges`, base sans port publié sur un réseau Docker sans accès à Internet.
- **Logs** (pino) : cookies, en-têtes d'autorisation, mots de passe et jetons masqués.

## Flux d'un achat (à venir, #23 et #24)

```
1. Le client connecté clique « Acheter »      POST /api/checkout {productSlug}
2. L'API crée la commande (pending) et la session Stripe Checkout, renvoie l'URL Stripe
3. Le client paie chez Stripe (case de renonciation au droit de rétractation)
4. Stripe appelle          POST /api/stripe/webhook   (signature vérifiée, corps brut)
5. checkout.session.completed, payment_status = paid :
     commande → paid (déjà « licensed » : on répond 200 sans rien faire)
     POST /api/v1/admin/licenses sur le serveur de licences → clé
     commande → licensed, e-mail avec la clé
   serveur de licences indisponible : réponse 500, Stripe réessaie, aucune clé en double
6. charge.refunded : la clé est révoquée, commande → refunded
7. La page /merci lit GET /api/orders/by-session/:id jusqu'à ce que la clé soit prête
```

Garantie centrale : `stripe_checkout_session_id` est **unique** ; un paiement ne peut donner qu'une licence, même si Stripe rejoue le webhook.

Blocages connus : l'API d'administration du serveur de licences (formes des réponses) et les prix des plugins doivent être fournis avant de coder ces étapes.

## Flux d'une publication de plugin

Voir [release-plugin.md](release-plugin.md) : la CI du plugin appelle `PUT /api/admin/releases/:produit/:version` puis envoie chaque jar ; le jar apparaît sur la page « Fichiers » du plugin.

## Pour aller plus loin

- Contrat de l'API pour le site : [api-front.md](api-front.md) et `apps/api/openapi.json`.
- Décisions : [adr/](adr/README.md).
- Exploitation : [runbook.md](runbook.md).
