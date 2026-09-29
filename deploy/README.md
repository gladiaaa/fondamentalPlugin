# Déploiement

La boutique tourne dans Docker sur le VPS, derrière nginx (HTTPS Let's Encrypt). Chaque environnement comprend trois conteneurs : le site, l'API et sa base PostgreSQL.

| Environnement | Branche | Adresse | Site | API | Base |
|---|---|---|---|---|---|
| dev | `dev` | https://dev.fondamentalplugin.fr | `fondamentalplugin-dev` sur `127.0.0.1:3101` | `fondamentalplugin-api-dev` sur `127.0.0.1:4101` | `fondamentalplugin-db-dev` (aucun port) |
| production | `prod` | https://fondamentalplugin.fr | `fondamentalplugin-prod` sur `127.0.0.1:3100` | `fondamentalplugin-api-prod` sur `127.0.0.1:4100` | `fondamentalplugin-db-prod` (aucun port) |

nginx envoie `/api/*` à l'API et tout le reste au site. **Le site ne doit donc pas créer de route sous `/api`.**

## Ce qui se passe à chaque push sur `dev` ou `prod`

1. GitHub Actions construit et publie trois images, avec la même étiquette `<branche>-<commit>` :
   - `ghcr.io/gladiaaa/fondamentalplugin` : le site ;
   - `ghcr.io/gladiaaa/fondamentalplugin-api` : l'API ;
   - `ghcr.io/gladiaaa/fondamentalplugin-api-migrate` : les migrations Prisma.
2. Il se connecte au VPS avec le compte `deploy`. Sa clé ne peut lancer **que** `deploy.sh` (option `command=` dans `authorized_keys`).
3. `deploy.sh` :
   1. télécharge les images ;
   2. démarre la base si besoin, puis **applique les migrations**. Si elles échouent, il s'arrête : la version en ligne n'a pas été touchée ;
   3. redémarre le site et l'API, puis vérifie que leur `/api/health` annonce la nouvelle version ;
   4. **si l'un des deux ne répond pas, il remet automatiquement la version précédente.**
4. Le workflow vérifie `/api/health` depuis Internet (à travers nginx, l'API et la base) ; en production, il publie une note de version.

### Migrations : toujours compatibles avec la version précédente

En cas de retour automatique à la version précédente, **les migrations déjà appliquées restent en place** : l'ancienne API doit donc fonctionner avec le nouveau schéma. On ajoute d'abord (nouvelle colonne facultative, nouvelle table), on supprime dans une version ultérieure, une fois que plus aucun code ne s'en sert.

## Sur le VPS

```
/opt/fondamentalplugin/
├── deploy.sh              # copie de deploy/deploy.sh
├── backup.sh              # copie de deploy/backup.sh (sauvegarde des bases, lancée par cron)
├── restore-test.sh        # copie de deploy/restore-test.sh (vérifie une sauvegarde)
├── offsite.sh             # copie de deploy/offsite.sh (copie chiffrée hors du VPS, lancée par cron)
├── offsite/               # clé publique GPG, clé de déploiement et dépôt local des copies (root, 700)
├── dev/
│   ├── compose.yml        # copie de deploy/compose.yml
│   ├── .env               # APP_ENV=dev, HOST_PORT=3101, API_PORT=4101
│   ├── secrets.env        # POSTGRES_PASSWORD (root:deploy, 640) : jamais dans le dépôt
│   ├── app.env            # variables du site (root:deploy, 640) ; doit contenir API_INTERNAL_URL=http://api:4000/api
│   ├── api.env            # secrets de l'API : Stripe, licences… (root:deploy, 640)
│   ├── deploy.env         # IMAGE_TAG, écrit par deploy.sh
│   └── current, previous  # versions en ligne et précédente
└── prod/                  # idem, APP_ENV=prod, HOST_PORT=3100, API_PORT=4100
```

Données de la base : volumes Docker `fondamentalplugin-db-dev` et `fondamentalplugin-db-prod`. Jars publiés par la CI des plugins : volumes `fondamentalplugin-releases-dev` et `fondamentalplugin-releases-prod` (pas encore dans les sauvegardes : ils se republient depuis les tags des plugins). Sauvegardes : `/var/backups/fondamentalplugin/<env>/`.

⚠️ `deploy.sh`, `backup.sh`, `restore-test.sh`, `offsite.sh`, `compose.yml` et `cron` ne sont **pas** copiés automatiquement : après une modification dans le dépôt, il faut les recopier sur le VPS (voir ci-dessous).

## Mise en place de l'API (une seule fois par environnement)

À faire en `root` sur le VPS, **après la fusion dans `dev`** de la PR qui ajoute l'API. Jusque-là, l'ancien `deploy.sh` continue de ne déployer que le site : rien ne casse entre-temps.

### 1. Fichiers communs

```bash
cd /opt/fondamentalplugin
SRC=https://raw.githubusercontent.com/gladiaaa/fondamentalPlugin/dev/deploy
curl -fsSL "$SRC/deploy.sh"       -o deploy.sh.new       && install -m 755 deploy.sh.new deploy.sh             && rm deploy.sh.new
curl -fsSL "$SRC/backup.sh"       -o backup.sh           && chmod 755 backup.sh
curl -fsSL "$SRC/restore-test.sh" -o restore-test.sh     && chmod 755 restore-test.sh
curl -fsSL "$SRC/offsite.sh"      -o offsite.sh          && chmod 755 offsite.sh
curl -fsSL "$SRC/alerte.sh"       -o alerte.sh           && chmod 755 alerte.sh
curl -fsSL "$SRC/cron"            -o /etc/cron.d/fondamentalplugin && chmod 644 /etc/cron.d/fondamentalplugin
```

### 2. Environnement `dev`

```bash
cd /opt/fondamentalplugin/dev
curl -fsSL "https://raw.githubusercontent.com/gladiaaa/fondamentalPlugin/dev/deploy/compose.yml" -o compose.yml
grep -q '^API_PORT=' .env || echo 'API_PORT=4101' >> .env
# Mot de passe de la base : généré ici, jamais écrit ailleurs.
[ -f secrets.env ] || ( umask 027 && printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 24)" > secrets.env )
touch api.env
chown root:deploy secrets.env api.env && chmod 640 secrets.env api.env
```

Puis relancer le déploiement de `dev` (depuis GitHub : *Actions → Déploiement → Run workflow → dev*, ou `gh workflow run deploy.yml --ref dev`) et vérifier :

```bash
curl -s http://127.0.0.1:4101/api/health   # {"ok":true,"version":"dev-…","database":"up"}
```

### 3. nginx pour `dev`

```bash
curl -fsSL "https://raw.githubusercontent.com/gladiaaa/fondamentalPlugin/dev/deploy/nginx/api-dev.conf" \
  -o /etc/nginx/snippets/fondamentalplugin-api-dev.conf
```

Dans `/etc/nginx/sites-available/fondamentalplugin`, bloc `server_name dev.fondamentalplugin.fr` (443), ajouter **avant** `location / {` :

```nginx
    include snippets/fondamentalplugin-api-dev.conf;
```

```bash
nginx -t && systemctl reload nginx
curl -s https://dev.fondamentalplugin.fr/api/health   # doit contenir "database":"up"
```

### Mot de passe de la préprod

`dev.fondamentalplugin.fr` demande un identifiant et un mot de passe (authentification HTTP de nginx, `api-dev.conf`). Restent ouverts, parce qu'ils ont déjà leur propre protection : la publication des jars (`/api/admin/releases/`, jeton), le webhook Stripe (`/api/stripe/webhook`, signature) et `/api/health` (vérification après déploiement, supervision). La préprod est aussi marquée « ne pas indexer ».

**1. Le compte**, en root sur le VPS (le mot de passe est saisi sans s'afficher, et jamais écrit en clair) :

```bash
( umask 027 && read -rp "Identifiant : " U && read -rsp "Mot de passe : " P && echo \
  && printf '%s:%s\n' "$U" "$(printf '%s' "$P" | openssl passwd -apr1 -stdin)" > /etc/nginx/fondamentalplugin-dev.htpasswd )
chgrp www-data /etc/nginx/fondamentalplugin-dev.htpasswd
```

Plusieurs personnes : une ligne par compte (remplacer `>` par `>>` pour en ajouter une).

**2. Les parcours automatiques** (GitHub, environnement `dev`) : variable `PREPROD_USER` et secret `PREPROD_PASSWORD`, avec le même compte.

```bash
gh variable set PREPROD_USER --env dev --repo gladiaaa/fondamentalPlugin --body "<identifiant>"
gh secret set PREPROD_PASSWORD --env dev --repo gladiaaa/fondamentalPlugin   # demande le mot de passe
```

**3. nginx**, en root sur le VPS :

```bash
cp /etc/nginx/snippets/fondamentalplugin-api-dev.conf /etc/nginx/snippets/fondamentalplugin-api-dev.conf.bak
curl -fsSL "https://raw.githubusercontent.com/gladiaaa/fondamentalPlugin/dev/deploy/nginx/api-dev.conf" \
  -o /etc/nginx/snippets/fondamentalplugin-api-dev.conf
nginx -t && systemctl reload nginx
curl -s -o /dev/null -w "%{http_code}\n" https://dev.fondamentalplugin.fr/                                # 401
curl -s https://dev.fondamentalplugin.fr/api/health                                                       # {"ok":true,…}
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://dev.fondamentalplugin.fr/api/stripe/webhook   # 400, pas 401
```

Retirer la protection : remettre la sauvegarde (`.bak`) puis `systemctl reload nginx`.

### 4. Production

Mêmes étapes 2 et 3 avec `prod`, `API_PORT=4100` et `api-prod.conf` (bloc `server_name fondamentalplugin.fr www.fondamentalplugin.fr`) :
- l'étape 2 (fichiers, `API_PORT`, `secrets.env`) **avant** de fusionner la première PR `dev` → `prod` qui contient l'API ;
- l'étape 3 (nginx) **après** ce déploiement, une fois `curl -s http://127.0.0.1:4100/api/health` correct.

### 5. Sauvegardes

```bash
/opt/fondamentalplugin/backup.sh dev                                          # sauvegarde immédiate
/opt/fondamentalplugin/restore-test.sh "$(ls -1t /var/backups/fondamentalplugin/dev/*.dump | head -1)"
```

## Sauvegardes

- Chaque nuit à 3 h 30 (`/etc/cron.d/fondamentalplugin`), `backup.sh` sauvegarde les bases prod et dev dans `/var/backups/fondamentalplugin/<env>/` (lisibles par root seul), relit chaque fichier et efface ceux de plus de 14 jours. Journal : `/var/log/fondamentalplugin-backup.log`.
- **Une fois par mois**, vérifier qu'une sauvegarde se restaure : `restore-test.sh` (dernière sauvegarde de prod par défaut) la charge dans une base jetable et affiche le contenu des tables, sans toucher aux bases en service.
- À 3 h 50, `offsite.sh` **chiffre** la dernière sauvegarde de chaque environnement (GPG, clé « Sauvegardes Fondamental » : la clé privée n'est pas sur le VPS, rien ne peut y déchiffrer) et la pousse dans le dépôt privé [`gladiaaa/fondamentalplugin-backups`](https://github.com/gladiaaa/fondamentalplugin-backups) (`<env>/<env>-AAAAMMJJ-HHMM.dump.gpg`). Les 30 dernières restent dans l'arborescence, l'historique Git garde toutes les autres. En cas d'échec de l'une ou l'autre tâche, `alerte.sh` prévient Discord (voir « Supervision »).

### Copie hors du VPS : installation (une seule fois)

Même clé GPG que les sauvegardes du serveur de licences (`/opt/license-backup`), clé de déploiement propre à ce dépôt :

```bash
O=/opt/fondamentalplugin/offsite
install -d -m 700 $O $O/gnupg
gpg --homedir /opt/license-backup/gnupg --export "$(cat /opt/license-backup/recipient)" | gpg --homedir $O/gnupg --batch --import
cp /opt/license-backup/recipient $O/recipient
ssh-keygen -q -t ed25519 -N "" -C "fondamentalplugin-backup@letterbot" -f $O/deploy_key
git init -q -b main $O/repo && git -C $O/repo remote add origin git@github.com:gladiaaa/fondamentalplugin-backups.git
git -C $O/repo config user.name "Sauvegarde VPS" && git -C $O/repo config user.email "backup@fondamentalplugin.fr"
cat $O/deploy_key.pub   # à ajouter au dépôt : Settings → Deploy keys, « Allow write access »
```

Puis recopier `offsite.sh` et `cron` (§ 1) et lancer une première copie : `/opt/fondamentalplugin/offsite.sh`.

### Tester une restauration depuis la copie externe

Une fois par mois, depuis le PC qui a la clé privée (Git Bash) : récupérer la dernière copie de prod, la déchiffrer et la restaurer dans la base jetable de `restore-test.sh` sur le VPS.

```bash
gh repo clone gladiaaa/fondamentalplugin-backups /tmp/fp-backups -- -q --depth 1
F=$(ls -1 /tmp/fp-backups/prod/*.gpg | sort | tail -1)
gpg -d "$F" | ssh -i ~/.ssh/id_ed25519_letterbot root@46.202.128.132 'T=$(mktemp) && cat > $T && /opt/fondamentalplugin/restore-test.sh $T; rm -f $T'
rm -rf /tmp/fp-backups
```

### Restaurer une base (incident)

```bash
ENV=prod; FILE=/var/backups/fondamentalplugin/$ENV/<fichier>.dump
docker stop fondamentalplugin-api-$ENV
docker exec -i fondamentalplugin-db-$ENV pg_restore -U fondamental -d fondamental --clean --if-exists --no-owner < "$FILE"
docker start fondamentalplugin-api-$ENV
```

## Supervision (#33)

| Quoi | Outil | Où regarder |
|---|---|---|
| Site, API, serveur de licences hors service | UptimeRobot (externe : prévient même si tout le VPS tombe) | alerte Discord |
| Erreurs de l'API et du site (serveur et navigateur) | Sentry, variable `SENTRY_DSN` (`api.env` pour l'API, `app.env` pour le site) | sentry.io |
| Sauvegarde ou copie externe ratée | `alerte.sh` dans `deploy/cron` | alerte Discord |
| Audience (sans cookies) et achats | Umami auto-hébergé, `https://stats.fondamentalplugin.fr` | tableau de bord Umami |

### Webhook Discord (une seule fois)

Dans Discord : *Paramètres du salon → Intégrations → Webhooks → Nouveau webhook*, copier l'URL. C'est un secret (qui l'a peut écrire dans le salon) : ne jamais la coller dans une issue ou un message. Sur le VPS, en root :

```bash
( umask 077 && read -rsp "URL du webhook Discord : " U && echo && printf '%s
' "$U" > /opt/fondamentalplugin/alerte-discord.url )
/opt/fondamentalplugin/alerte.sh "Test d'alerte" false   # doit poster un message dans le salon
```

### UptimeRobot (une seule fois)

Compte gratuit sur uptimerobot.com, puis *Integrations → Discord* avec la même URL de webhook. Sondes (toutes les 5 minutes) :

| Nom | Type | Adresse | Condition |
|---|---|---|---|
| Site dev | Keyword | `https://dev.fondamentalplugin.fr/plugins` | contient `FondamentalTag` (catalogue chargé depuis l'API) ; renseigner l'identifiant et le mot de passe de la préprod dans les réglages d'authentification HTTP de la sonde |
| API dev | Keyword | `https://dev.fondamentalplugin.fr/api/health` | contient `"database":"up"` |
| Serveur de licences | HTTP | `http://46.202.128.132:8091/healthz` | code 200 |
| Site prod | HTTP | `https://fondamentalplugin.fr/` | code 200 (les sondes prod API/catalogue le jour de la mise en production) |

Tester l'alerte : `docker stop fondamentalplugin-api-dev`, attendre le message Discord (5 à 10 min), puis `docker start fondamentalplugin-api-dev` (un message « de nouveau en ligne » suit).

### Sentry pour le site

Dans `app.env` de l'environnement : `SENTRY_DSN=…` (un projet Sentry « Next.js », ou le même que l'API : les événements portent l'environnement et la version). Le site lit la variable au démarrage, pas à la construction de l'image : recréer le conteneur `web` suffit. Un DSN n'est pas secret (le navigateur l'utilise), mais inutile de le publier.

### Umami (une seule fois)

1. DNS : enregistrement `A` `stats.fondamentalplugin.fr` → IP du VPS.
2. En root sur le VPS :

   ```bash
   curl -fsSL https://raw.githubusercontent.com/gladiaaa/fondamentalPlugin/dev/deploy/umami/install.sh -o /tmp/umami-install.sh
   bash /tmp/umami-install.sh
   ```

   Le script démarre Umami (`/opt/fondamentalplugin/umami`, écoute sur 127.0.0.1:3200), fait choisir le mot de passe du compte `admin` **avant** d'ouvrir le site sur Internet, crée les sites « dev » et « prod », installe nginx + HTTPS (certbot), puis écrit `UMAMI_URL` et `UMAMI_WEBSITE_ID` dans `dev/app.env` et recrée le site dev.
3. Dans Umami, activer la double authentification du compte admin.

Événements suivis en plus des pages vues : `achat-clic` (bouton « Acheter la licence ») et `achat-confirme` (licence livrée sur `/merci`), avec le plugin concerné. Aucune donnée personnelle.

## Revenir à la version précédente

```bash
ssh <admin>@vps 'cd /opt/fondamentalplugin/prod && sudo -u deploy ../deploy.sh deploy prod "$(cat previous)" < /dev/null'
```

Les migrations de la version annulée restent appliquées (voir « Migrations » plus haut).

## Secrets GitHub

| Secret | Contenu |
|---|---|
| `DEPLOY_HOST` | adresse du VPS |
| `DEPLOY_SSH_KEY` | clé privée du compte `deploy` (dédiée à GitHub Actions) |
| `DEPLOY_KNOWN_HOSTS` | empreinte SSH du VPS (`ssh-keyscan <vps>`) |

Les environnements GitHub `dev` et `production` n'acceptent respectivement que les branches `dev` et `prod`.
