# API Fondamental Plugin : guide pour construire le site

Fiche d'intégration à donner telle quelle à qui construit le front (`apps/web`). Le contrat exact (corps, réponses, erreurs de chaque route) est dans [`apps/api/openapi.json`](../apps/api/openapi.json), généré depuis le code et vérifié par un test ; ce guide donne les règles, les parcours et le contexte.

La section 4 liste les routes **disponibles** (en ligne sur dev, testées). La section 7 liste les routes **prévues** : elles n'existent pas encore et leur forme est un contrat indicatif qui peut bouger ; ne pas construire de pages dessus sans vérifier l'issue correspondante.

**Quand une PR ajoute ou change une route** : elle met à jour `openapi.json` (`npm run openapi -w @fondamental/api`) et ce guide.

---

## 1. Le projet en deux minutes

Boutique de plugins Minecraft (Paper 1.21.x) : **FondamentalBedwars, FondamentalTag, FondamentalCrate, FondamentalPass**. Achat unique, licence à vie. Le client crée un compte, achète un plugin (Stripe), reçoit une **clé de licence** qu'il colle dans le `config.yml` du plugin. Les téléchargements des jars sont publics. Le wiki est public. Le générateur de configuration est réservé aux acheteurs.

Monorepo npm : `apps/web` (Next.js 16, App Router, React 19, Tailwind 4), `apps/api` (NestJS), `packages/shared` (types partagés, `import type` uniquement, `@fondamental/shared`).

## 2. Environnements

| | Site | API |
|---|---|---|
| Local | `http://localhost:3000` | `http://localhost:4000/api` |
| Dev | `https://dev.fondamentalplugin.fr` | `https://dev.fondamentalplugin.fr/api` |
| Prod | `https://fondamentalplugin.fr` | `https://fondamentalplugin.fr/api` (**pas encore déployée**) |

L'API est servie **sous `/api`, sur le même domaine que le site** : pas de CORS. En local, le site et l'API sont sur deux ports : ajouter dans `apps/web/next.config.ts` un `rewrites()` qui relaie `/api/:path*` vers `http://localhost:4000/api/:path*` (pas encore fait).

Documentation interactive (hors production) : `/api/docs` (Swagger), avec les corps, réponses et erreurs de chaque route ; le même contenu est dans `apps/api/openapi.json`, dont on peut générer des types ou un client.

## 3. Règles à respecter dans TOUS les appels

1. **Cookies** : le navigateur envoie le cookie de session tout seul si l'appel est fait sur le même domaine : `fetch('/api/…', { credentials: 'same-origin' })`. Le cookie est `HttpOnly` (`__Host-session` sur dev/prod, `session` en local) : le JavaScript ne le lit pas et ne doit jamais essayer.
2. **Origin** : l'API refuse (403) toute requête qui **modifie** des données (POST, PUT, PATCH, DELETE) sans `Origin` égale à celle du site. Le navigateur l'envoie tout seul ; c'est seulement un piège pour les appels faits depuis le serveur Next.js (voir §8).
3. **Jeton anti-CSRF** : toute requête qui modifie des données **et** qui exige une session doit envoyer l'en-tête `X-CSRF-Token` avec le `csrfToken` reçu à la connexion ou via `GET /api/auth/me`. Sans lui : 403.
4. **Corps JSON** (`Content-Type: application/json`). Les champs inconnus sont **refusés** (400) : n'envoyer que ceux du contrat.
5. **Jamais** de mot de passe, jeton ou clé de licence dans une URL ni dans les logs du front.
6. **Format d'erreur** (voir §5) : toujours lire `message` et, quand il existe, `code`.

## 4. Routes disponibles

Préfixe : `/api`. « Session » = cookie de session + `X-CSRF-Token` sur les requêtes qui modifient.

### Santé

| Route | Accès | Réponse |
|---|---|---|
| `GET /health` | public | `200 { ok: true, version: "dev-4a9b293", database: "up" }` ; `503` si la base est en panne |

### Catalogue : `/products`, public, sans compte

| Route | Réponse |
|---|---|
| `GET /products` | `200` : tableau de `ProductResponse`, dans l'ordre d'affichage (bedwars, tag, crate, pass) |
| `GET /products/:slug` | `200` : un `ProductResponse` ; `404` si le plugin n'existe pas ou n'est plus en vente |

`ProductResponse` (type dans `@fondamental/shared`) : `slug`, `name`, `description`, `distribution`, `requirements`, `price`, `purchasable`.

- `distribution` : `SINGLE_JAR` (Bedwars, Pass : un seul jar, la licence décide de l'édition) ou `FREE_PREMIUM_JARS` (Tag, Crate : deux jars, `free` et `premium`).
- `requirements` : `{ platform, java, dependencies: [{ name, required, note }] }`. À afficher sur la page du plugin : les dépendances obligatoires (`required: true`, ex. FastAsyncWorldEdit pour Bedwars) en évidence, les autres comme « recommandé ».
- `price` : `{ amountCents, currency }` (en centimes : 1999 = 19,99) ou `null` tant que le prix n'est pas fixé. **Aujourd'hui les 4 plugins n'ont pas de prix** : afficher « Bientôt disponible » quand `price` est `null`.
- `purchasable` : à respecter pour afficher ou non le bouton d'achat. Il n'est `true` que si le plugin a un prix et est configuré chez Stripe.
- Les textes (`name`, `description`, `note`) sont en français ; la version anglaise viendra avec la question des langues.

### Comptes : `/auth`

| Route | Accès | Corps | Réponse |
|---|---|---|---|
| `POST /auth/register` | public | `{ email, password }` | `202 { message }` : **identique** que l'adresse existe déjà ou non |
| `POST /auth/verify-email` | public | `{ token }` | `200 { emailVerified: true }` ; `400 INVALID_LINK` |
| `POST /auth/resend-verification` | public | `{ email }` | `202 { message }` (une minute minimum entre deux envois) |
| `POST /auth/login` | public | `{ email, password }` | `200 { user, csrfToken }` + cookie de session |
| `POST /auth/logout` | public | (vide) | `204` (efface le cookie, fonctionne même session expirée) |
| `POST /auth/logout-all` | session | (vide) | `204` (ferme toutes les sessions du compte) |
| `GET /auth/me` | session | – | `200 { user, csrfToken }` |
| `POST /auth/forgot-password` | public | `{ email }` | `202 { message }` : identique que le compte existe ou non |
| `POST /auth/reset-password` | public | `{ token, password }` | `204` ; `400 INVALID_LINK` ou `PASSWORD_COMPROMISED` |
| `POST /auth/change-password` | session | `{ currentPassword, newPassword }` | `204` ; ferme les **autres** sessions |

Règles utiles pour les formulaires :

- E-mail : valide, 254 caractères maximum ; l'API le met en minuscules et retire les espaces.
- Mot de passe : **10 à 128 caractères**, refusé s'il figure dans des fuites connues (`PASSWORD_COMPROMISED`). Pas d'autre règle de composition. À la **connexion**, aucune règle n'est révélée.
- Jeton (`token`) : chaîne de 20 à 200 caractères, à lire dans l'URL de la page puis à **retirer de l'URL** (`history.replaceState`).
- Un compte est **bloqué 15 min après 5 échecs de connexion** ; l'erreur est alors la même que pour un mauvais mot de passe (le site ne doit pas distinguer).
- **Aucune connexion tant que l'adresse n'est pas confirmée** : mot de passe correct sur un compte non confirmé → `403 EMAIL_NOT_VERIFIED`. La page doit alors proposer « Renvoyer le lien » (`resend-verification`).
- Session : 30 jours, absolue.
- Limites par IP et par minute : inscription 5, connexion 10, confirmation 10, renvoi du lien 3, mot de passe oublié 5, réinitialisation 10, changement de mot de passe 5. Dépassement : `429`.
- `503` sur inscription, renvoi et mot de passe oublié si l'envoi d'e-mails est indisponible : afficher « Réessayez plus tard ».

Objet `user` : `{ id: string, email: string, createdAt: string (ISO 8601) }`. Il ne contient **jamais** de mot de passe.

## 5. Erreurs

Corps : `{ statusCode, message: string | string[], error?, code? }`. `message` est un tableau pour les erreurs de validation (un texte par champ invalide).

| Statut | Quand | `code` |
|---|---|---|
| 400 | Validation, lien invalide, mot de passe refusé | `INVALID_LINK`, `PASSWORD_COMPROMISED`, `CURRENT_PASSWORD_INVALID`, `NO_PASSWORD`, `SAME_PASSWORD` |
| 401 | Pas de session, ou e-mail / mot de passe incorrect (message volontairement générique) | – |
| 403 | Origin refusée, jeton CSRF absent ou faux, adresse non confirmée | `EMAIL_NOT_VERIFIED` pour ce dernier cas |
| 404 | Plugin inconnu ou retiré de la vente (et, plus tard, ressource qui n'appartient pas au compte) | – |
| 429 | Trop de requêtes | – |
| 503 | E-mails indisponibles, ou base en panne (`/health`) | – |

Les autres codes n'ont pas de `code` : afficher `message`. Quand un `401` arrive sur une route protégée, la session a expiré : rediriger vers la connexion.

## 6. Parcours à construire avec les routes disponibles

1. **Inscription** → `register` → écran « Regardez vos e-mails » (le message est identique dans tous les cas : ne jamais dire « adresse déjà utilisée »).
2. **Page `/verifier-email?token=…`** (attendue par le lien de l'e-mail) → lit le jeton, appelle `POST /auth/verify-email`, affiche le résultat. Doit envoyer `Referrer-Policy: no-referrer`.
3. **Connexion** → `login` → garder `csrfToken` en mémoire (pas dans `localStorage`). Gérer `EMAIL_NOT_VERIFIED` (bouton « Renvoyer le lien »).
4. **Au chargement du site** : `GET /auth/me` (401 = visiteur non connecté, pas une erreur à afficher) pour récupérer l'état de connexion et un `csrfToken` frais.
5. **Mot de passe oublié** → `forgot-password` → e-mail → **page `/reinitialiser-mot-de-passe?token=…`** → `reset-password` → connexion (toutes les sessions sont fermées).
6. **Compte** : changer le mot de passe (`change-password`), se déconnecter partout (`logout-all`).

## 7. Routes prévues (contrat indicatif, non implémentées)

Chaque groupe a une issue GitHub : les détails et décisions y sont.

### Fichiers (#27), publics, sans compte
- `GET /products/:slug/minecraft-versions` : versions de Minecraft ayant au moins un fichier (Paper 1.21.x au départ).
- `GET /products/:slug/files?minecraft=1.21.4` : fichiers compatibles, du plus récent au plus ancien : version du plugin (texte libre, pas toujours `1.2.3`), **`edition`** (`UNIVERSAL`, `FREE` ou `PREMIUM`), versions Minecraft couvertes, date, changelog, taille, **SHA-256**.
- `GET /downloads/:fileId` : téléchargement du jar.

### Achat (#23, #24)
- `POST /checkout` `{ productSlug }` (session) → `{ url }` : rediriger le navigateur vers Stripe Checkout. Le paiement est confirmé par un webhook côté serveur : le site ne déclenche jamais la licence.
- `GET /orders/by-session/:sessionId` (session) : état de la commande pour la page `/merci` (`pending`, `paid`, `licensed`, `refunded`) et la clé quand elle est prête. **Interroger toutes les 2 s** tant que la licence n'est pas prête.
- Adresse e-mail confirmée obligatoire pour acheter. Une case de renonciation au droit de rétractation est affichée par Stripe.

### Espace client (#25, #45)
- `GET /me/licenses` : mes licences (produit, clé, statut, installations utilisées / maximum).
- `GET /me/licenses/:key` : détail et liste des installations.
- `DELETE /me/licenses/:key/activations/:installationId` : libérer une installation.
- `POST /me/licenses/claim` `{ key }` : rattacher une clé existante (anciens clients TagsCustom). Réponse volontairement identique pour clé inconnue, révoquée ou déjà prise.

### Générateur de configuration (#30), acheteurs uniquement
- `GET /configs/:slug/:version/files` : fichiers configurables (ex. `crates.yml`, `tags.yml`, `season.yml`, `quests.yml`).
- `GET /configs/:slug/:version/:file/schema?minecraft=1.21.4` : schéma de formulaire (libellés, valeurs par défaut, options `premium`).
- `GET/POST/PUT/DELETE /me/configs` : configurations enregistrées (plugin, version, fichier, nom, valeurs).
- `POST /me/configs/:id/render` : renvoie le YAML à télécharger, avec `license.key` pré-remplie. Non-acheteur : `403`.

### Connexion OAuth (#18)
- `GET /auth/oauth/:provider` (`microsoft`, `discord`, `google`) : redirection vers le fournisseur ; retour sur `GET /auth/oauth/:provider/callback` qui ouvre la session et redirige vers le site. Boutons « Continuer avec … » à prévoir, en plus du formulaire e-mail.

### Données personnelles (#19) et administration (#32)
Export et suppression du compte ; back-office (commandes, licences, produits, versions). Routes pas encore définies.

## 8. Piège : appeler l'API depuis le serveur Next.js

- **Données publiques** (catalogue, fichiers, versions) : peuvent être lues côté serveur (Server Components), sans cookie ni CSRF.
- **Tout ce qui dépend de la session** (`/auth/me`, `/me/*`, `/checkout`, `/configs`) : le faire **depuis le navigateur** (composants clients), pour que le cookie et l'`Origin` partent tout seuls. Le faire côté serveur exigerait de relayer le cookie et de fixer `Origin` à la main : à éviter.
- Ne jamais mettre `csrfToken` dans `localStorage` ni dans une URL ; le garder en mémoire et le redemander avec `GET /auth/me`.

## 9. Types partagés

`@fondamental/shared` (`packages/shared/src/index.ts`) : `AuthUser`, `SessionResponse` (`{ user, csrfToken }`), `MessageResponse`, `ApiError` (avec la liste des `code`), `ApiHealthResponse`. Import : `import type { … } from '@fondamental/shared'`. Les nouveaux types des routes prévues y seront ajoutés au fur et à mesure.

## 10. Tester sans pages

Sur dev, l'inscription envoie de vrais e-mails : utiliser une adresse à soi. Le lien de l'e-mail mène à `/verifier-email`, qui n'existe qu'une fois la page construite ; d'ici là on confirme avec `POST /api/auth/verify-email` en collant le jeton du lien. En local, sans clé d'envoi d'e-mails, les messages s'affichent dans les logs de l'API (`npm run dev -w @fondamental/api`, base : `docker compose -f compose.dev.yml up -d`).

## 11. Ce qui reste à décider (peut changer le front)

Prix et devise (EUR seul ou aussi USD) · limite d'installations par licence · offres groupées (plusieurs licences dans une commande) · langues du site (français seul ou français et anglais dès le départ) · pages légales (CGV, mentions, confidentialité : #35).

## 12. Règles du dépôt (à respecter côté front aussi)

Issue → branche depuis `dev` (`feature/<n°>-<sujet>`) → PR vers `dev` avec `Closes #<n°>` ; commits en français ; jamais de push sur `dev` ni `prod` ; jamais de fusion sans l'accord explicite de l'humaine. Next.js 16 : `params` et `searchParams` sont des Promise, `middleware` s'appelle `proxy` ; en cas de doute, lire `node_modules/next/dist/docs/`. Avant une PR : `npm run lint`, `typecheck`, `test`, `build` doivent passer.
