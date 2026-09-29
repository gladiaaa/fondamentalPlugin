# Architecture

Ce document explique **comment la boutique est construite** et où chercher quand on modifie quelque chose. Pour installer le projet : [README](../README.md). Pour intervenir en cas de panne : [runbook](runbook.md). Pour le **pourquoi** des choix : [décisions](adr/README.md).

> Les parties marquées **(à venir)** sont décidées mais pas encore codées : elles renvoient à l'issue GitHub qui les réalise.

## Vue d'ensemble

```
Navigateur ─► nginx ─┬─ fondamentalplugin.fr/*      ─► conteneur web  (Next.js)
                     └─ fondamentalplugin.fr/api/*  ─► conteneur api  (NestJS) ─► conteneur db (PostgreSQL)
                                                            │
Stripe ── webhook ─────► /api/stripe/webhook                ├─► serveur de licences (existant)
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
| `auth` | Comptes : inscription, confirmation d'e-mail, connexion, mot de passe oublié, sessions, protections (CSRF, blocage, limites) ; export et suppression du compte (RGPD) ; nettoyage horaire des sessions et liens expirés | fait |
| `catalog` | `GET /api/products` : les plugins, leurs prérequis et leur prix | fait |
| `releases` | Versions et jars : liste par version de Minecraft, téléchargement public, publication par la CI (`/api/admin/releases`) | fait |
| `mail` | Envoi d'e-mails derrière une abstraction `Mailer` (Resend en ligne, journal en local, boîte en mémoire dans les tests), bilingues FR/EN (langue choisie à l'inscription) | fait (#26) : chaque e-mail part en HTML (gabarit `mail/layout.ts`, données échappées) et en texte brut ; reçu avec la clé après paiement, e-mail de remboursement. Un envoi raté ne bloque jamais la licence (renvoi possible depuis `/admin`) |
| `prisma` | Accès à la base | fait |
| `common`, `config` | Documentation OpenAPI partagée, variables d'environnement validées au démarrage, logs, erreurs inattendues remontées à Sentry | fait |
| `licenses` | Client du serveur de licences (`LicenseServerClient` : `get`, `create`, `revoke`, `releaseActivation`) ; rattacher une clé existante, statut détaillé et installations | fait (#22, #45, #25) |
| `orders` | `POST /api/checkout` (session Stripe Checkout), `GET /api/orders/by-session/:id`, `POST /api/stripe/webhook` (licence créée une seule fois, remboursement → révocation) | fait (#23, #24, #96, #99) ; **en service sur dev** (Stripe en mode test) ; prod : clés live et prix à configurer, voir [runbook.md](runbook.md) |
| `support` | `POST /api/support` : formulaire de contact, e-mail transmis à l'équipe (`SUPPORT_EMAIL`, à confirmer) | fait (#81) |
| `configs` | Générateur de configuration réservé aux acheteurs : schéma par fichier et par version (`configs/schemas/`), YAML livré avec le plugin comme base (`configs/templates/`, commentaires gardés), clé de licence pré-remplie, configurations enregistrées | API faite (#30) : config.yml des 4 plugins, `crates.yml`, `tags.yml`, `season.yml`, `quests.yml` |
| OAuth (dans `auth`) | Connexion Microsoft, Discord, Google | #18 |
| `admin` | Back-office : 2FA (TOTP) obligatoire, commandes (recherche, détail, remboursement, renvoi d'e-mail), licences (statut, révocation, recréation), produits (liste, prix, description, disponibilité), utilisateurs (recherche, détail, blocage, rôle), versions publiées (masquer, canal, changelog), tableau de bord (`/admin/stats`) et journal (`/admin/actions`). Toutes les actions sont journalisées (`admin_actions`). Hors `openapi.json` public | API faite (#32, #105) ; pages `/admin` : #106 |

Règles communes (détaillées dans [CLAUDE.md](../CLAUDE.md)) : entrées validées strictement (`whitelist` + `forbidNonWhitelisted`), aucune entité de base renvoyée telle quelle, aucun secret dans les logs, une route protégée = un test « accès refusé », chaque route documentée dans `apps/api/openapi.json`.

## Données (PostgreSQL 17, Prisma)

| Table | Contenu |
|---|---|
| `users` | Adresse (unique), date de confirmation, empreinte argon2id du mot de passe (vide pour un compte OAuth), compteur d'échecs et blocage, rôle (`customer`/`admin` ; le premier admin en base, les suivants depuis le panel), date de blocage (#105), secret TOTP et date d'activation de la 2FA |
| `sessions` | Jeton **haché**, jeton anti-CSRF, expiration (30 jours) : révocable ; date de validation de la 2FA pour cette session (`admin`, #32) |
| `email_tokens` | Liens de confirmation et de réinitialisation : jeton **haché**, usage unique, expiration |
| `products` | Les plugins : slug, description, prérequis, prix (nul tant que non fixé), nom côté serveur de licences |
| `minecraft_versions` | Versions de Minecraft, avec un rang de tri calculé depuis le numéro |
| `releases`, `release_files` | Versions d'un plugin et leurs jars (édition, taille, SHA-256, versions de Minecraft couvertes, compteur de téléchargements) |
| `licenses` | Clés rattachées à un compte (une seule ligne par clé, jamais deux comptes) ; `order_id` présent pour une clé créée par un achat |
| `orders` | Commandes Stripe : statut (`pending` → `paid` → `licensed`/`refunded`), montant et devise au moment de l'achat |
| `admin_actions` | Journal des actions sensibles du back-office (qui, quoi, quand) : remboursement, révocation, changement de prix… (#32) |
| `saved_configs` | Configurations enregistrées du générateur (#30) : plugin, version, fichier, valeurs du formulaire |
| `oauth_accounts` | Comptes tiers (#18) (à venir) |

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

## Flux d'un achat (#23 et #24)

```
1. Le client connecté clique « Acheter »      POST /api/checkout {productSlug}
2. L'API crée la commande (pending) et la session Stripe Checkout, renvoie l'URL Stripe
3. Le client paie chez Stripe (case de renonciation au droit de rétractation)
4. Stripe appelle          POST /api/stripe/webhook   (signature vérifiée, corps brut)
5. checkout.session.completed ou async_payment_succeeded, payment_status ≠ unpaid
   (paid, ou no_payment_required avec un code promo à 100 %) :
     commande → paid (déjà « licensed » : on répond 200 sans rien faire)
     POST /api/v1/admin/licenses sur le serveur de licences → clé
     commande → licensed, e-mail au client avec la clé (#26 ; un échec d'envoi ne bloque rien)
   serveur de licences indisponible : réponse 500, Stripe réessaie, aucune clé en double
   paiement différé (SEPA, virement) : completed arrive unpaid (rien n'est livré),
     puis async_payment_succeeded livre ; async_payment_failed : commande laissée pending
   Stripe crée et envoie la facture (invoice_creation) ; mentions légales dans le Dashboard
6. charge.refunded, remboursement total : la clé est révoquée, commande → refunded
   (remboursement partiel : licence conservée)
7. La page /merci lit GET /api/orders/by-session/:id jusqu'à ce que la clé soit prête
```

Garantie centrale : `stripe_checkout_session_id` est **unique** ; un paiement ne peut donner qu'une licence, même si Stripe rejoue le webhook.

**En service sur dev** depuis le 28/09/2026 : achat, licence, facture et remboursement (clé révoquée) vérifiés de bout en bout avec Stripe en mode test. Sur dev, les licences viennent d'une **instance de test du serveur de licences** (voir [runbook.md](runbook.md)), jamais de la prod. **Pas encore en prod** : clés Stripe live, prix réels et webhook de prod à configurer ; tant que ce n'est pas fait, `POST /api/checkout` y répond `503`.

## Flux d'une publication de plugin

Voir [release-plugin.md](release-plugin.md) : la CI du plugin appelle `PUT /api/admin/releases/:produit/:version` puis envoie chaque jar ; le jar apparaît sur la page « Fichiers » du plugin.

## Pour aller plus loin

- Contrat de l'API pour le site : [api-front.md](api-front.md) et `apps/api/openapi.json`.
- Décisions : [adr/](adr/README.md).
- Exploitation : [runbook.md](runbook.md).
