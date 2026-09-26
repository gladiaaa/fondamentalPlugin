#!/bin/sh
# Déploiement d'une version de la boutique (site + API) sur le VPS.
#
# Seule commande autorisée pour la clé SSH de GitHub Actions (compte « deploy »,
# option command= dans authorized_keys) : la clé ne peut rien faire d'autre.
#
#   ssh deploy@vps "deploy <dev|prod> <tag>"   (jeton GHCR lu sur l'entrée standard)
#
# Étapes :
#   1. téléchargement des images (site, API, migrations) ;
#   2. démarrage de la base si besoin, puis migrations Prisma. En cas d'échec,
#      on s'arrête là : la version en ligne n'a pas été touchée ;
#   3. redémarrage du site et de l'API, puis vérification de leur /api/health ;
#   4. si l'un des deux ne répond pas, retour automatique à la version précédente.
#
# Les migrations ne sont jamais annulées : elles doivent rester compatibles avec
# la version précédente de l'API (ajouter avant de supprimer). Voir deploy/README.md.
set -eu

# FP_ROOT et FP_SKIP_PULL servent uniquement aux essais locaux : la connexion SSH
# restreinte de GitHub Actions ne peut pas transmettre de variables d'environnement.
ROOT=${FP_ROOT:-/opt/fondamentalplugin}
REGISTRY=ghcr.io/gladiaaa
IMAGES="fondamentalplugin fondamentalplugin-api fondamentalplugin-api-migrate"

# Commande reçue : via SSH (SSH_ORIGINAL_COMMAND) ou en arguments pour un usage manuel.
# shellcheck disable=SC2086
set -- ${SSH_ORIGINAL_COMMAND:-"$@"}
[ "${1:-}" = "deploy" ] && [ $# -eq 3 ] || { echo "usage : deploy <dev|prod> <tag>" >&2; exit 2; }
ENV=$2
TAG=$3

case "$ENV" in
  dev|prod) ;;
  *) echo "environnement inconnu : $ENV" >&2; exit 2 ;;
esac
echo "$TAG" | grep -Eq '^[a-z0-9][a-z0-9._-]{0,63}$' || { echo "tag invalide : $TAG" >&2; exit 2; }

DIR=$ROOT/$ENV
cd "$DIR"
. ./.env   # APP_ENV, HOST_PORT, API_PORT
: "${HOST_PORT:?HOST_PORT manquant dans .env}" "${API_PORT:?API_PORT manquant dans .env}"
[ -r secrets.env ] || { echo "secrets.env manquant dans $DIR (voir deploy/README.md)" >&2; exit 2; }

compose() {
  docker compose --env-file .env --env-file secrets.env --env-file deploy.env "$@"
}

# Connexion au registre le temps du déploiement, dans un dossier jetable :
# aucun identifiant ne reste sur le serveur.
DOCKER_CONFIG=$(mktemp -d)
export DOCKER_CONFIG
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
if read -r TOKEN && [ -n "$TOKEN" ]; then
  echo "$TOKEN" | docker login ghcr.io -u deploy --password-stdin >/dev/null
fi

if [ -z "${FP_SKIP_PULL:-}" ]; then
  for image in $IMAGES; do
    docker pull -q "$REGISTRY/$image:$TAG" >/dev/null
  done
fi

PREVIOUS=$(cat current 2>/dev/null || true)

use() {
  echo "IMAGE_TAG=$1" > deploy.env
}

# Attend que http://127.0.0.1:<port>/api/health annonce la version <tag>.
healthy() {
  i=0
  while [ $i -lt 30 ]; do
    if curl -fsS "http://127.0.0.1:$1/api/health" 2>/dev/null | grep -q "\"$2\""; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

# ─── Base et migrations ──────────────────────────────────────────
use "$TAG"
compose up -d --wait db
if ! compose run --rm migrate; then
  echo "$ENV : migrations de $TAG en échec, rien n'a été mis en ligne" >&2
  [ -n "$PREVIOUS" ] && use "$PREVIOUS"
  exit 1
fi

# ─── Site et API ─────────────────────────────────────────────────
compose up -d --remove-orphans web api
if healthy "$HOST_PORT" "$TAG" && healthy "$API_PORT" "$TAG"; then
  echo "$TAG" > current
  [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$TAG" ] && echo "$PREVIOUS" > previous
  echo "$ENV : $TAG en ligne (site et API)"
  # Ne garde que les versions actuelle et précédente de chaque environnement ;
  # les images des autres projets du serveur ne sont jamais touchées.
  KEEP=$(cat "$ROOT"/dev/current "$ROOT"/dev/previous "$ROOT"/prod/current "$ROOT"/prod/previous 2>/dev/null || true)
  for image in $IMAGES; do
    docker images "$REGISTRY/$image" --format '{{.Tag}}' | while read -r t; do
      echo "$KEEP" | grep -qx "$t" || docker rmi -f "$REGISTRY/$image:$t" >/dev/null 2>&1 || true
    done
  done
  exit 0
fi

echo "$ENV : $TAG ne répond pas, retour à ${PREVIOUS:-aucune version}" >&2
compose logs --tail 50 web api >&2 || true
if [ -n "$PREVIOUS" ]; then
  use "$PREVIOUS"
  # Si l'API n'existait pas encore dans la version précédente (premier déploiement
  # de l'API), on remet au moins le site.
  compose up -d web api || compose up -d web || true
  if healthy "$HOST_PORT" "$PREVIOUS" && healthy "$API_PORT" "$PREVIOUS"; then
    echo "$ENV : retour à $PREVIOUS effectué" >&2
  else
    echo "$ENV : retour à $PREVIOUS incomplet, intervention nécessaire" >&2
  fi
fi
exit 1
