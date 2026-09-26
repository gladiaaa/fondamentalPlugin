#!/bin/sh
# Vérifie qu'une sauvegarde se restaure, dans une base PostgreSQL jetable
# (aucun effet sur les bases en service). À lancer une fois par mois.
#
#   restore-test.sh                 # dernière sauvegarde de prod
#   restore-test.sh <fichier.dump>
#
# Affiche le nombre de lignes de chaque table restaurée.
set -eu

DEST=${FP_BACKUP_DIR:-/var/backups/fondamentalplugin}
FILE=${1:-$(ls -1t "$DEST"/prod/prod-*.dump 2>/dev/null | head -n 1)}
[ -n "$FILE" ] && [ -r "$FILE" ] || { echo "aucune sauvegarde trouvée (${FILE:-$DEST/prod})" >&2; exit 2; }

NAME=fondamentalplugin-restore-test-$$
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Restauration de $FILE dans un conteneur jetable…"
docker run -d --rm --name "$NAME" --network none \
  -e POSTGRES_USER=fondamental -e POSTGRES_DB=fondamental -e POSTGRES_PASSWORD=restore-test \
  postgres:17-alpine >/dev/null

# En TCP : pendant l'initialisation, le serveur temporaire n'écoute que sur le socket local.
i=0
until docker exec "$NAME" pg_isready -h 127.0.0.1 -U fondamental -d fondamental >/dev/null 2>&1; do
  i=$((i + 1)); [ $i -lt 30 ] || { echo "la base jetable ne démarre pas" >&2; exit 1; }
  sleep 1
done

docker exec -i "$NAME" pg_restore -U fondamental -d fondamental --no-owner --exit-on-error < "$FILE"

docker exec "$NAME" psql -U fondamental -d fondamental -At -F ' : ' -c "
  SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY relname;" \
  | sed 's/^/  /'
echo "Restauration réussie."
