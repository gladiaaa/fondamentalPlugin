# Déploiement

Le site tourne dans Docker sur le VPS, derrière nginx (HTTPS Let's Encrypt).

| Environnement | Branche | Adresse | Conteneur | Port local |
|---|---|---|---|---|
| dev | `dev` | https://dev.fondamentalplugin.fr | `fondamentalplugin-dev` | `127.0.0.1:3101` |
| production | `prod` | https://fondamentalplugin.fr | `fondamentalplugin-prod` | `127.0.0.1:3100` |

## Ce qui se passe à chaque push sur `dev` ou `prod`

1. GitHub Actions construit l'image et la publie sur `ghcr.io/gladiaaa/fondamentalplugin` (étiquette `<branche>-<commit>`).
2. Il se connecte au VPS avec le compte `deploy`. Sa clé ne peut lancer **que** `deploy.sh` (option `command=` dans `authorized_keys`).
3. `deploy.sh` télécharge l'image, redémarre le conteneur et vérifie `/api/health`. **Si la nouvelle version ne répond pas, la précédente est remise automatiquement.**
4. Le workflow vérifie le site depuis Internet ; en production, il publie une note de version.

## Sur le VPS

```
/opt/fondamentalplugin/
├── deploy.sh              # copie de deploy/deploy.sh
├── dev/
│   ├── compose.yml        # copie de deploy/compose.yml
│   ├── .env               # APP_ENV=dev, HOST_PORT=3101
│   ├── app.env            # secrets de l'application (vide pour l'instant)
│   ├── deploy.env         # IMAGE_TAG, écrit par deploy.sh
│   └── current, previous  # versions en ligne et précédente
└── prod/                  # idem, APP_ENV=prod, HOST_PORT=3100
```

## Revenir à la version précédente

```bash
ssh <admin>@vps 'cd /opt/fondamentalplugin/prod && sudo -u deploy ../deploy.sh deploy prod "$(cat previous)" < /dev/null'
```

## Secrets GitHub

| Secret | Contenu |
|---|---|
| `DEPLOY_HOST` | adresse du VPS |
| `DEPLOY_SSH_KEY` | clé privée du compte `deploy` (dédiée à GitHub Actions) |
| `DEPLOY_KNOWN_HOSTS` | empreinte SSH du VPS (`ssh-keyscan <vps>`) |

Les environnements GitHub `dev` et `production` n'acceptent respectivement que les branches `dev` et `prod`.
