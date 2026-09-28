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

Données de la base : volumes Docker `fondamentalplugin-db-dev` et `fondamentalplugin-db-prod`. Sauvegardes : `/var/backups/fondamentalplugin/<env>/`.

⚠️ `deploy.sh`, `backup.sh`, `restore-test.sh`, `compose.yml` et `cron` ne sont **pas** copiés automatiquement : après une modification dans le dépôt, il faut les recopier sur le VPS (voir ci-dessous).

## Mise en place de l'API (une seule fois par environnement)

À faire en `root` sur le VPS, **après la fusion dans `dev`** de la PR qui ajoute l'API. Jusque-là, l'ancien `deploy.sh` continue de ne déployer que le site : rien ne casse entre-temps.

### 1. Fichiers communs

```bash
cd /opt/fondamentalplugin
SRC=https://raw.githubusercontent.com/gladiaaa/fondamentalPlugin/dev/deploy
curl -fsSL "$SRC/deploy.sh"       -o deploy.sh.new       && install -m 755 deploy.sh.new deploy.sh             && rm deploy.sh.new
curl -fsSL "$SRC/backup.sh"       -o backup.sh           && chmod 755 backup.sh
curl -fsSL "$SRC/restore-test.sh" -o restore-test.sh     && chmod 755 restore-test.sh
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
- ⚠️ Les sauvegardes restent **sur le VPS** : une panne du serveur les emporterait avec la base. La copie externe est suivie dans une issue dédiée.

### Restaurer une base (incident)

```bash
ENV=prod; FILE=/var/backups/fondamentalplugin/$ENV/<fichier>.dump
docker stop fondamentalplugin-api-$ENV
docker exec -i fondamentalplugin-db-$ENV pg_restore -U fondamental -d fondamental --clean --if-exists --no-owner < "$FILE"
docker start fondamentalplugin-api-$ENV
```

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
