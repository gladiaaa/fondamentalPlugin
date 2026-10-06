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

### Fichiers : publics, sans compte

| Route | Réponse |
|---|---|
| `GET /products/:slug/minecraft-versions` | `200` : tableau de versions (`["1.21.11", "1.21.4"]`), de la plus récente à la plus ancienne, celles qui ont au moins un fichier : c'est le contenu du **sélecteur de version** ; `404` si le plugin est inconnu |
| `GET /products/:slug/files` | `200` : tableau de `ReleaseFileResponse`, du plus récent au plus ancien |
| `GET /products/:slug/files?minecraft=1.21.4` | idem, seulement les fichiers compatibles avec cette version (`400` si le format est mauvais ; tableau vide si aucun fichier) |
| `GET /downloads/:fileId` | le fichier (`Content-Disposition: attachment`) ; `404` si inconnu ; `429` au-delà de 30 par minute et par adresse IP |

`ReleaseFileResponse` (type dans `@fondamental/shared`) : `id`, `edition`, `platform`, `fileName`, `sizeBytes`, `sha256`, `minecraftVersions`, `downloadCount`, `downloadUrl`, `release` (`version`, `channel`, `changelog`, `releasedAt`).

- **`edition`** : `UNIVERSAL` = jar unique (Bedwars, Pass), la clé de licence décide de l'édition ; `FREE` / `PREMIUM` = les deux jars de Tag et Crate (`distribution: FREE_PREMIUM_JARS` dans le catalogue). Pour ces deux plugins, chaque version a **deux fichiers** : présenter « Gratuit » et « Premium » côte à côte, et préciser qu'un jar Premium sans clé valide fonctionne comme le gratuit. Les téléchargements sont publics : ne demander aucun compte.
- **`release.version`** : texte libre (`2.2.0`, `1.0-SNAPSHOT`) : ne jamais la traiter comme un numéro ni la trier soi-même (l'API trie déjà par date de sortie).
- `downloadUrl` : lien direct (`/api/downloads/:id`) à mettre dans un `<a href>` : pas de `fetch`, le navigateur télécharge tout seul.
- `sha256` : à afficher avec le fichier pour que le client puisse le vérifier.
- Tant qu'aucune version n'est publiée (#28), toutes ces listes sont **vides** : prévoir l'état « aucun fichier disponible pour l'instant ».
- Une version de Minecraft mal formée (`?minecraft=abc`) donne `400` : le sélecteur ne propose que celles de `minecraft-versions`, donc cela n'arrive pas en usage normal.

### Comptes : `/auth`

| Route | Accès | Corps | Réponse |
|---|---|---|---|
| `POST /auth/register` | public | `{ email, password }` | `202 { message }` : **identique** que l'adresse existe déjà ou non. L'en-tête `Accept-Language` du navigateur choisit la langue des e-mails du compte (`fr` par défaut, `en` sinon), mémorisée une fois pour toutes |
| `POST /auth/verify-email` | public | `{ token }` | `200 { emailVerified: true }` ; `400 INVALID_LINK` |
| `POST /auth/resend-verification` | public | `{ email }` | `202 { message }` (une minute minimum entre deux envois) |
| `POST /auth/login` | public | `{ email, password }` | `200 { user, csrfToken }` + cookie de session |
| `POST /auth/logout` | public | (vide) | `204` (efface le cookie, fonctionne même session expirée) |
| `POST /auth/logout-all` | session | (vide) | `204` (ferme toutes les sessions du compte) |
| `GET /auth/me` | session | – | `200 { user, csrfToken }` |
| `POST /auth/forgot-password` | public | `{ email }` | `202 { message }` : identique que le compte existe ou non |
| `POST /auth/reset-password` | public | `{ token, password }` | `204` ; `400 INVALID_LINK` ou `PASSWORD_COMPROMISED` |
| `POST /auth/change-password` | session | `{ currentPassword, newPassword }` | `204` ; ferme les **autres** sessions |

### Mes données : `/me` (RGPD)

| Route | Accès | Corps | Réponse |
|---|---|---|---|
| `GET /me/export` | session | (vide) | `200` : JSON de toutes les données du compte (`AccountExport`) : compte, sessions, commandes payées, clés de licence, configurations enregistrées. Servi en téléchargement `mes-donnees-fondamental.json`. Jamais de mot de passe ni de jeton de connexion |
| `DELETE /me` | session | `{ password }` | `204` : compte supprimé, cookie effacé, e-mail de confirmation envoyé ; `400 CURRENT_PASSWORD_INVALID` (mot de passe faux, l'échec compte pour le blocage) ; `400 NO_PASSWORD` (compte sans mot de passe) |

La suppression est **définitive** : demander une confirmation claire et le mot de passe dans le formulaire, puis renvoyer le visiteur vers l'accueil (plus aucune session). Pour l'export, appeler la route avec `fetch` puis proposer le fichier au téléchargement (ou ouvrir l'adresse dans un nouvel onglet : c'est un `GET`).

### Commandes : `/me/orders`

| Route | Accès | Corps | Réponse |
|---|---|---|---|
| `GET /me/orders` | session | (vide) | `200` : `MyOrder[]` = `{ id, createdAt, product: { slug, name }, amountCents, currency, status }`, la plus récente d'abord. Seulement les commandes payées (`PAID`, `LICENSED`, `REFUNDED`) : un paiement abandonné n'apparaît jamais. `amountCents` = montant réellement payé, code promo compris |
| `GET /me/orders/:id/invoice` | session | (vide) | `200` : `{ url }`, la facture Stripe (lue à la demande, jamais stockée) ; `404 ORDER_NOT_FOUND` (commande inconnue, non payée **ou d'un autre compte** — même réponse) ; `404 INVOICE_NOT_FOUND` (Stripe n'a pas encore créé la facture, quelques secondes après le paiement) ; `503 PAYMENT_UNAVAILABLE` |

Pour la facture : ouvrir l'onglet **dans le clic** (sinon le navigateur bloque la fenêtre), puis lui donner l'adresse une fois la réponse reçue.

### Licences : `/me/licenses`

| Route | Accès | Corps | Réponse |
|---|---|---|---|
| `GET /me/licenses` | session | (vide) | `200` : tableau `{ id, product: { slug, name } \| null, key, claimedAt }[]`, les plus récentes en premier (`product` : plugin de la clé, sert au générateur de configuration) |
| `GET /me/licenses/:id` | session | (vide) | `:id` = identifiant interne donné par `GET /me/licenses`, **jamais la clé** (#91). `200` : `{ id, key, claimedAt, product: { slug, name } \| null, edition, revoked, expiresAt, maxActivations, activations: { installationId, firstSeenAt, lastSeenAt }[] }` ; `404 LICENSE_NOT_FOUND` (licence inconnue **ou d'un autre compte** — même réponse) ; `503 LICENSE_SERVER_UNAVAILABLE` |
| `DELETE /me/licenses/:id/activations/:installationId` | session | (vide) | `204` : installation libérée ; `404 LICENSE_NOT_FOUND` (licence ou installation inconnue, ou licence d'un autre compte) ; `503 LICENSE_SERVER_UNAVAILABLE` |
| `POST /me/licenses/claim` | session | `{ key }` | `204` : la clé est rattachée au compte ; `400 LICENSE_CLAIM_INVALID` (clé inconnue, révoquée, **ou déjà rattachée** — même réponse dans les trois cas, ne pas essayer de deviner laquelle) ; `503 LICENSE_SERVER_UNAVAILABLE` |

Réservé aux clés qui existaient déjà **avant** la boutique (anciens clients, clés faites à la main) : une clé achetée sur le site sera rattachée automatiquement (#24), pas besoin de ce formulaire. Prévoir un champ simple (« Vous avez déjà une clé de licence ? ») plutôt qu'une page dédiée. Limite stricte : 5 tentatives par minute.

`activations[].installationId` : à repasser tel quel à `DELETE .../activations/:installationId` pour libérer un emplacement (réinstallation de serveur). Forme provisoire (dépend du serveur de licences existant, voir #22).

Règles utiles pour les formulaires :

- E-mail : valide, 254 caractères maximum ; l'API le met en minuscules et retire les espaces.
- Mot de passe : **10 à 128 caractères**, refusé s'il figure dans des fuites connues (`PASSWORD_COMPROMISED`). Pas d'autre règle de composition. À la **connexion**, aucune règle n'est révélée.
- Jeton (`token`) : chaîne de 20 à 200 caractères, à lire dans l'URL de la page puis à **retirer de l'URL** (`history.replaceState`).
- Un compte est **bloqué 15 min après 5 échecs de connexion** ; l'erreur est alors la même que pour un mauvais mot de passe (le site ne doit pas distinguer).
- **Aucune connexion tant que l'adresse n'est pas confirmée** : mot de passe correct sur un compte non confirmé → `403 EMAIL_NOT_VERIFIED`. La page doit alors proposer « Renvoyer le lien » (`resend-verification`).
- Session : 30 jours, absolue.
- Limites par IP et par minute : inscription 5, connexion 10, confirmation 10, renvoi du lien 3, mot de passe oublié 5, réinitialisation 10, changement de mot de passe 5, export des données 10, suppression du compte 5. Dépassement : `429`.
- `503` sur inscription, renvoi et mot de passe oublié si l'envoi d'e-mails est indisponible : afficher « Réessayez plus tard ».

Objet `user` : `{ id: string, email: string, createdAt: string (ISO 8601) }`. Il ne contient **jamais** de mot de passe.

### Achat : `/checkout`, `/orders` (#23, #24)

| Route | Accès | Corps | Réponse |
|---|---|---|---|
| `POST /checkout` | session | `{ productSlug }` | `201` : `{ url }`, rediriger le navigateur vers Stripe Checkout ; `400 PRODUCT_NOT_PURCHASABLE` ; `503 PAYMENT_UNAVAILABLE` |
| `GET /orders/by-session/:sessionId` | session | (vide) | `200` : `{ status, productSlug, licenseKey }` (`status` : `PENDING`/`PAID`/`LICENSED`/`REFUNDED`, `licenseKey` non nul seulement si `LICENSED`) ; `404 ORDER_NOT_FOUND` |

Le paiement est confirmé par un webhook côté serveur (`/api/stripe/webhook`, jamais appelé par le site) : le site ne déclenche jamais la licence lui-même. Sur `/merci`, **interroger `GET /orders/by-session/:sessionId` toutes les 2 s** tant que `status` n'est pas `LICENSED` (ou `REFUNDED`, en cas de remboursement immédiat). Adresse e-mail confirmée obligatoire pour acheter. Une case de renonciation au droit de rétractation est affichée par Stripe.

**Utilisable sur dev** (Stripe en mode test, carte `4242 4242 4242 4242`) depuis #101 : bouton `features/checkout/BuyButton`, page `/merci`. **Pas encore en prod** : `POST /checkout` y répond `503 PAYMENT_UNAVAILABLE` tant que les clés Stripe live et les prix ne sont pas configurés.

### Générateur de configuration : `/configs`, `/me/configs` (#30)

| Route | Accès | Corps | Réponse |
|---|---|---|---|
| `GET /configs/:slug` | public | (vide) | `200` : `{ slug, versions: [{ version, files: [{ file, label, description }] }] }`, la version la plus récente en premier ; `404 CONFIG_NOT_FOUND` |
| `GET /configs/:slug/:version/:file` | public | (vide) | `200` : `{ slug, version, file, label, description, fields, defaults }` : le schéma du formulaire (`ConfigField` dans `@fondamental/shared`) et les valeurs livrées avec le plugin ; `404 CONFIG_NOT_FOUND` |
| `POST /me/configs/render` | session | `{ slug, version, file, values }` | `200` : `{ file, yaml }`, le fichier complet avec `license.key` = la clé de l'acheteur ; `400 CONFIG_INVALID` (un texte par champ dans `message`) ; `403 CONFIG_NOT_BUYER` sans licence de ce plugin |
| `GET /me/configs` | session | (vide) | `200` : configurations enregistrées `{ id, name, slug, version, file, values, createdAt, updatedAt }[]` |
| `POST /me/configs` | session | `{ slug, version, file, name, values }` | `201` : la configuration ; `400 CONFIG_INVALID` / `CONFIG_LIMIT` (50 par compte) ; `403 CONFIG_NOT_BUYER` |
| `GET /me/configs/:id` | session | (vide) | `200` ; `404 CONFIG_NOT_FOUND` (inconnue **ou d'un autre compte**) |
| `PATCH /me/configs/:id` | session | `{ name, values }` | `200` ; mêmes erreurs |
| `DELETE /me/configs/:id` | session | (vide) | `204` ; `404 CONFIG_NOT_FOUND` |
| `POST /me/configs/:id/upgrade` | session | `{ version }` | `200` : les valeurs encore valides pour la nouvelle version sont gardées |

**Principe** : chaque fichier part du YAML livré avec la version du plugin. `values` n'a pas besoin d'être complet : un champ absent garde la valeur livrée, et tout ce qui n'est pas dans le schéma (commentaires compris) reste tel quel dans le fichier généré. Une entrée nommée (une crate, un tag, un palier…) ou une liste se remplace en entier. Rendu à la demande, pour l'aperçu comme pour le téléchargement : la clé n'est jamais stockée dans les configurations enregistrées.

### Contact : `/support` (#81)

| Route | Accès | Corps | Réponse |
|---|---|---|---|
| `POST /support` | public | `{ subject, email, licenseKey?, message }` | `202` : `{ message }` (ne détaille jamais si le message est bien arrivé à l'équipe, comme `/auth/register`) ; `503` si l'envoi d'e-mails est indisponible |

Pas besoin de compte : pré-remplir `email` depuis la session si le visiteur est connecté, sinon lui demander. `licenseKey` facultatif (si le message porte sur une licence précise). Limite : 5 requêtes par minute et par IP. `subject` et `message` : 1 à 200 et 1 à 5000 caractères.

## 5. Erreurs

Corps : `{ statusCode, message: string | string[], error?, code? }`. `message` est un tableau pour les erreurs de validation (un texte par champ invalide).

| Statut | Quand | `code` |
|---|---|---|
| 400 | Validation, lien invalide, mot de passe refusé, clé de licence invalide | `INVALID_LINK`, `PASSWORD_COMPROMISED`, `CURRENT_PASSWORD_INVALID`, `NO_PASSWORD`, `SAME_PASSWORD`, `LICENSE_CLAIM_INVALID` |
| 401 | Pas de session, ou e-mail / mot de passe incorrect (message volontairement générique) | – |
| 403 | Origin refusée, jeton CSRF absent ou faux, adresse non confirmée, compte bloqué | `EMAIL_NOT_VERIFIED`, `ACCOUNT_BLOCKED` pour ces deux derniers cas |
| 404 | Plugin inconnu ou retiré de la vente (et, plus tard, ressource qui n'appartient pas au compte) | – |
| 429 | Trop de requêtes | – |
| 503 | E-mails indisponibles, base en panne (`/health`), ou serveur de licences indisponible | `LICENSE_SERVER_UNAVAILABLE` pour ce dernier cas |

Les autres codes n'ont pas de `code` : afficher `message`. Quand un `401` arrive sur une route protégée, la session a expiré : rediriger vers la connexion.

## 6. Parcours à construire avec les routes disponibles

1. **Inscription** → `register` → écran « Regardez vos e-mails » (le message est identique dans tous les cas : ne jamais dire « adresse déjà utilisée »).
2. **Page `/verifier-email?token=…`** (attendue par le lien de l'e-mail) → lit le jeton, appelle `POST /auth/verify-email`, affiche le résultat. Doit envoyer `Referrer-Policy: no-referrer`.
3. **Connexion** → `login` → garder `csrfToken` en mémoire (pas dans `localStorage`). Gérer `EMAIL_NOT_VERIFIED` (bouton « Renvoyer le lien »).
4. **Au chargement du site** : `GET /auth/me` (401 = visiteur non connecté, pas une erreur à afficher) pour récupérer l'état de connexion et un `csrfToken` frais.
5. **Mot de passe oublié** → `forgot-password` → e-mail → **page `/reinitialiser-mot-de-passe?token=…`** → `reset-password` → connexion (toutes les sessions sont fermées).
6. **Compte** : changer le mot de passe (`change-password`), se déconnecter partout (`logout-all`).
7. **Mes données** : télécharger l'export (`GET /me/export`), supprimer le compte (`DELETE /me` avec le mot de passe).
8. **Vieille clé de licence** : formulaire de rattachement (`POST /me/licenses/claim`), puis affichage dans `GET /me/licenses`.

## 7. Routes prévues (contrat indicatif, non implémentées)

Chaque groupe a une issue GitHub : les détails et décisions y sont.

Achat (#23, #24) et espace client détaillé (#25) : maintenant dans la section 4 (`## 4. Routes disponibles`), ce sont de vraies routes.

### Connexion OAuth (#18)
- `GET /auth/oauth/:provider` (`microsoft`, `discord`, `google`) : redirection vers le fournisseur ; retour sur `GET /auth/oauth/:provider/callback` qui ouvre la session et redirige vers le site. Boutons « Continuer avec … » à prévoir, en plus du formulaire e-mail.

### Administration (#32, #105)
Back-office, réservé au rôle `ADMIN` **avec la 2FA validée pour la session** : sinon `403` (`TWO_FACTOR_REQUIRED` si seule la 2FA manque). Hors `openapi.json`. Toute modification est journalisée (`admin_actions`). Types dans `@fondamental/shared` (`Admin…`).

| Route | Corps / paramètres | Réponse |
|---|---|---|
| `GET /admin/2fa` | – | `{ enabled, verifiedForSession }` : mise en place à faire, ou code à saisir pour cette session. Rôle admin seul exigé |
| `POST /admin/2fa/setup` | – | `201 { secret, otpauthUrl }` : QR code (`otpauthUrl`) ou saisie manuelle. Rôle admin seul exigé. **2FA déjà activée : seulement depuis une session où elle a été validée** (`403 TWO_FACTOR_ALREADY_ENABLED` sinon : un mot de passe volé ne suffit pas à remplacer le secret) |
| `POST /admin/2fa/verify` | `{ code }` | `204` ; à refaire à chaque nouvelle session. `400 TOTP_INVALID_CODE` |
| `GET /admin/stats` | – | `AdminStatsResponse` : chiffre d'affaires (total, 30 jours), commandes par statut, ventes et téléchargements par plugin, ventes par jour sur 30 jours, comptes, 10 dernières actions |
| `GET /admin/actions` | `?targetType=&targetId=&limit=` (1–200, défaut 50) | `AdminActionEntry[]` |
| `GET /admin/orders` | `?status=&email=` | `AdminOrderSummary[]` (100 max) |
| `GET /admin/orders/:id` | – | `AdminOrderDetail` (avec la clé) |
| `POST /admin/orders/:id/refund` | – | `204` : remboursé chez Stripe, clé révoquée |
| `POST /admin/orders/:id/resend-email` | – | `202` |
| `GET /admin/licenses/:key` | – | `AdminLicenseResponse` |
| `POST /admin/licenses/:key/revoke` · `/recreate` | – | `204` · `{ key }` |
| `GET /admin/products` · `GET /admin/products/:slug` | – | `AdminProductResponse[]` · `AdminProductResponse` (produits retirés compris) |
| `PATCH /admin/products/:slug` | `{ description?, priceCents?, stripePriceId?, active? }` | `AdminProductResponse` |
| `GET /admin/users` | `?q=` (morceau d'e-mail) | `AdminUserSummary[]` (100 max) |
| `GET /admin/users/:id` | – | `AdminUserDetail` (commandes, licences) ; `404 USER_NOT_FOUND` |
| `PATCH /admin/users/:id` | `{ role?: "CUSTOMER" | "ADMIN", blocked?: boolean }` | `AdminUserDetail`. Bloquer ferme ses sessions et refuse sa connexion (`403 ACCOUNT_BLOCKED`). Repasser client ferme ses sessions. Soi-même : `400 CANNOT_MODIFY_SELF` |
| `GET /admin/releases` | `?product=<slug>` | `AdminReleaseResponse[]` (versions masquées comprises, avec fichiers et téléchargements) |
| `PATCH /admin/releases/:id` | `{ hidden?, channel?: "RELEASE" | "BETA", changelog? }` | `AdminReleaseResponse`. Masquée : absente de la page publique, fichiers non téléchargeables. `404 RELEASE_NOT_FOUND` |

Pages : les clés de licence ne vont jamais dans l'URL du site (la route API `/admin/licenses/:key` est appelée depuis le navigateur, pas affichée). Nommer le premier admin : `UPDATE users SET role = 'ADMIN' WHERE email = '…'` dans la base de l'environnement ; les suivants depuis le panel.

À la suppression d'un compte, les commandes seront **anonymisées et conservées** (obligation comptable) et les licences resteront valides.

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
