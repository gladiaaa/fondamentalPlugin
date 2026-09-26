#!/bin/sh
# Déploiement d'une image du site sur le VPS.
#
# Seule commande autorisée pour la clé SSH de GitHub Actions (compte « deploy »,
# option command= dans authorized_keys) : la clé ne peut rien faire d'autre.
#
#   ssh deploy@vps "deploy <dev|prod> <tag>"   (jeton GHCR lu sur l'entrée standard)
#
# Étapes : téléchargement de l'image, redémarrage du conteneur, vérification de
# /api/health, et retour automatique à la version précédente si elle échoue.
set -eu

IMAGE=ghcr.io/gladiaaa/fondamentalplugin
ROOT=/opt/fondamentalplugin

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
. ./.env   # APP_ENV, HOST_PORT

# Connexion au registre le temps du déploiement, dans un dossier jetable :
# aucun identifiant ne reste sur le serveur.
DOCKER_CONFIG=$(mktemp -d)
export DOCKER_CONFIG
trap 'rm -rf "$DOCKER_CONFIG"' EXIT
if read -r TOKEN && [ -n "$TOKEN" ]; then
  echo "$TOKEN" | docker login ghcr.io -u deploy --password-stdin >/dev/null
fi

docker pull -q "$IMAGE:$TAG"

PREVIOUS=$(cat current 2>/dev/null || true)

up() {
  echo "IMAGE_TAG=$1" > deploy.env
  docker compose --env-file .env --env-file deploy.env up -d --remove-orphans
}

healthy() {
  i=0
  while [ $i -lt 30 ]; do
    if curl -fsS "http://127.0.0.1:$HOST_PORT/api/health" 2>/dev/null | grep -q "\"$1\""; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

up "$TAG"
if healthy "$TAG"; then
  echo "$TAG" > current
  [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$TAG" ] && echo "$PREVIOUS" > previous
  echo "$ENV : $TAG en ligne"
  # Ne garde que les versions actuelle et précédente de chaque environnement ;
  # les images des autres projets du serveur ne sont jamais touchées.
  KEEP=$(cat "$ROOT"/dev/current "$ROOT"/dev/previous "$ROOT"/prod/current "$ROOT"/prod/previous 2>/dev/null || true)
  docker images "$IMAGE" --format '{{.Tag}}' | while read -r t; do
    echo "$KEEP" | grep -qx "$t" || docker rmi -f "$IMAGE:$t" >/dev/null 2>&1 || true
  done
  exit 0
fi

echo "$ENV : $TAG ne répond pas, retour à ${PREVIOUS:-aucune version}" >&2
docker compose --env-file .env --env-file deploy.env logs --tail 50 web >&2 || true
if [ -n "$PREVIOUS" ]; then
  up "$PREVIOUS"
  healthy "$PREVIOUS" && echo "$ENV : retour à $PREVIOUS effectué" >&2
fi
exit 1
