#!/bin/sh
# Lance une tâche planifiée et prévient Discord si elle échoue (#33). Utilisé par deploy/cron :
#
#   alerte.sh "Sauvegarde" /opt/fondamentalplugin/backup.sh
#
# L'adresse du webhook Discord est lue dans ALERT_WEBHOOK_FILE (root seul) ; sans ce fichier, la
# tâche tourne normalement, sans alerte. La sortie de la tâche est recopiée telle quelle (journal cron).
set -u

NAME=$1
shift
WEBHOOK_FILE=${ALERT_WEBHOOK_FILE:-/opt/fondamentalplugin/alerte-discord.url}
OUT=$(mktemp)
trap 'rm -f "$OUT" "$OUT.curl"' EXIT

"$@" > "$OUT" 2>&1
code=$?
cat "$OUT"
[ "$code" -eq 0 ] && exit 0

if [ -s "$WEBHOOK_FILE" ]; then
  # L'adresse passe par un fichier de configuration de curl, pas par la ligne de commande (visible dans ps).
  ( umask 077 && printf 'url = "%s"\n' "$(cat "$WEBHOOK_FILE")" > "$OUT.curl" )
  # Message JSON construit par python3 (échappement des guillemets et retours à la ligne du journal).
  NAME="$NAME" CODE="$code" HOST="$(hostname)" python3 - "$OUT" <<'PY' |
import json, os, sys
tail = open(sys.argv[1], encoding="utf-8", errors="replace").read()[-1500:]
print(json.dumps({"content": f"⚠️ **{os.environ['NAME']}** a échoué sur {os.environ['HOST']} "
                             f"(code {os.environ['CODE']}).\n```\n{tail}\n```"}))
PY
    curl -fsS -m 15 -K "$OUT.curl" -H "Content-Type: application/json" --data-binary @- > /dev/null \
    || echo "alerte Discord non envoyée" >&2
fi
exit "$code"
