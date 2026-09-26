#!/bin/sh
# Sauvegarde des bases de la boutique (lancée chaque nuit par cron, voir deploy/cron).
#
#   backup.sh            # prod et dev
#   backup.sh prod       # un seul environnement
#
# Résultat : /var/backups/fondamentalplugin/<env>/<env>-AAAAMMJJ-HHMM.dump
# (format personnalisé de pg_dump, à restaurer avec pg_restore), lisible par root seul.
# Chaque sauvegarde est relue avant d'être gardée ; au-delà de KEEP_DAYS jours, elle est effacée.
#
# ⚠️ Ces sauvegardes restent sur le VPS : une copie externe est prévue dans une issue à part.
set -eu

DEST=${FP_BACKUP_DIR:-/var/backups/fondamentalplugin}
KEEP_DAYS=${KEEP_DAYS:-14}
umask 077

[ $# -gt 0 ] || set -- prod dev
status=0
for ENV in "$@"; do
  case "$ENV" in dev|prod) ;; *) echo "environnement inconnu : $ENV" >&2; exit 2 ;; esac
  DB=fondamentalplugin-db-$ENV
  if [ "$(docker inspect -f '{{.State.Running}}' "$DB" 2>/dev/null)" != "true" ]; then
    echo "$ENV : base $DB non démarrée, ignorée"
    continue
  fi

  mkdir -p "$DEST/$ENV"
  FILE=$DEST/$ENV/$ENV-$(date -u +%Y%m%d-%H%M).dump
  # Fichier temporaire, renommé seulement si la sauvegarde est complète et relisible.
  if docker exec "$DB" pg_dump -U fondamental -d fondamental --format=custom > "$FILE.tmp" \
     && docker exec -i "$DB" pg_restore --list < "$FILE.tmp" > /dev/null; then
    mv "$FILE.tmp" "$FILE"
    echo "$ENV : $FILE ($(du -h "$FILE" | cut -f1))"
  else
    rm -f "$FILE.tmp"
    echo "$ENV : ÉCHEC de la sauvegarde" >&2
    status=1
    continue
  fi

  find "$DEST/$ENV" -name "$ENV-*.dump" -mtime +"$KEEP_DAYS" -delete
done
exit $status
