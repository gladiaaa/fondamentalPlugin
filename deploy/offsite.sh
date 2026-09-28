#!/bin/sh
# Copie chiffrée, hors du VPS, des sauvegardes de la boutique (#41). Lancé par cron juste après
# backup.sh (voir deploy/cron).
#
#   offsite.sh            # prod et dev
#   offsite.sh prod       # un seul environnement
#
# Prend la dernière sauvegarde de chaque environnement (/var/backups/fondamentalplugin/<env>/, déjà
# relue par backup.sh), la chiffre avec GPG pour la clé « Sauvegardes Fondamental » (seul le PC qui a
# la clé privée peut déchiffrer : rien ne le peut sur le VPS) et la pousse dans le dépôt privé
# gladiaaa/fondamentalplugin-backups, avec une clé de déploiement propre à ce dépôt.
# L'arborescence garde les OFFSITE_KEEP dernières par environnement ; l'historique Git garde tout.
#
# Installation unique : voir deploy/README.md (« Copie hors du VPS »).
set -eu

DEST=${FP_BACKUP_DIR:-/var/backups/fondamentalplugin}
O=${FP_OFFSITE_DIR:-/opt/fondamentalplugin/offsite}
KEEP=${OFFSITE_KEEP:-30}
umask 077

[ -s "$O/recipient" ] && [ -d "$O/repo/.git" ] || { echo "copie externe non installée ($O)" >&2; exit 2; }
RECIPIENT=$(cat "$O/recipient")

[ $# -gt 0 ] || set -- prod dev
for ENV in "$@"; do
  case "$ENV" in dev|prod) ;; *) echo "environnement inconnu : $ENV" >&2; exit 2 ;; esac
  LATEST=$(ls -1t "$DEST/$ENV/$ENV"-*.dump 2>/dev/null | head -n 1 || true)
  if [ -z "$LATEST" ]; then
    echo "$ENV : aucune sauvegarde à copier"
    continue
  fi

  mkdir -p "$O/repo/$ENV"
  OUT=$O/repo/$ENV/$(basename "$LATEST").gpg
  if [ -e "$OUT" ]; then
    echo "$ENV : $(basename "$LATEST") déjà copiée"
    continue
  fi
  gpg --homedir "$O/gnupg" --batch --yes --trust-model always -r "$RECIPIENT" --encrypt -o "$OUT.tmp" "$LATEST"
  mv "$OUT.tmp" "$OUT"
  echo "$ENV : $(basename "$OUT") chiffrée"

  # Arborescence : les KEEP plus récentes (les noms datés se trient dans l'ordre chronologique).
  ls -1 "$O/repo/$ENV"/*.gpg | sort | head -n -"$KEEP" | xargs -r rm -f
done

cd "$O/repo"
git add -A
if git diff --cached --quiet; then
  echo "rien de nouveau à envoyer"
  exit 0
fi
git commit -q -m "Sauvegarde du $(date -u +%F)"
GIT_SSH_COMMAND="ssh -i $O/deploy_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" git push -q -u origin main
echo "$(date -u +%FT%TZ) copie externe envoyée"
