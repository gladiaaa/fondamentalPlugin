#!/usr/bin/env bash
# Installe Umami (mesure d'audience sans cookies, #33) sur le VPS. Une seule fois, en root, SUR le VPS :
#
#   curl -fsSL https://raw.githubusercontent.com/gladiaaa/fondamentalPlugin/dev/deploy/umami/install.sh -o /tmp/umami-install.sh
#   bash /tmp/umami-install.sh
#
# Prérequis : l'enregistrement DNS A « stats.fondamentalplugin.fr » pointe vers le VPS.
# Le script peut être relancé : il reprend là où il s'était arrêté.
set -euo pipefail

DOMAIN=stats.fondamentalplugin.fr
DIR=/opt/fondamentalplugin/umami
SRC="https://raw.githubusercontent.com/gladiaaa/fondamentalPlugin/${UMAMI_SRC_REF:-dev}/deploy"
LOCAL=http://127.0.0.1:3200
DEV_DIR=/opt/fondamentalplugin/dev

etape() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
stop() { printf '\033[31mArrêt : %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || stop "à lancer en root"
for cmd in docker curl python3 nginx certbot ss; do
  command -v "$cmd" >/dev/null || stop "commande $cmd introuvable"
done

TMP=$(mktemp -d)
chmod 700 "$TMP"
trap 'rm -rf "$TMP"' EXIT

# Appel de l'API d'Umami ; le jeton passe par un fichier (jamais sur la ligne de commande, visible dans ps).
api() { # api MÉTHODE CHEMIN [JSON sur l'entrée standard]
  local args=(-fsS -X "$1" "$LOCAL/api$2" -H "Content-Type: application/json")
  [ -f "$TMP/auth" ] && args+=(-H "@$TMP/auth")
  if [ "$1" = POST ]; then curl "${args[@]}" --data-binary @-; else curl "${args[@]}"; fi
}
json() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }

etape "1. DNS"
IP=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1 {print $1}')
[ -n "$IP" ] || stop "$DOMAIN ne résout pas encore : ajouter l'enregistrement A vers ce serveur, puis relancer"
hostname -I | tr ' ' '\n' | grep -qx "$IP" || stop "$DOMAIN pointe vers $IP, qui n'est pas ce serveur"
echo "$DOMAIN -> $IP (ce serveur)"

etape "2. Conteneurs"
if ss -ltn 'sport = :3200' | grep -q LISTEN && ! docker ps --format '{{.Names}}' | grep -qx fondamentalplugin-umami; then
  stop "le port 3200 est déjà pris par autre chose"
fi
install -d -m 750 "$DIR"
cd "$DIR"
curl -fsSL "$SRC/umami/compose.yml" -o compose.yml
if [ ! -f secrets.env ]; then
  # Secrets générés ici, jamais écrits ailleurs.
  ( umask 077 && printf 'UMAMI_DB_PASSWORD=%s\nUMAMI_APP_SECRET=%s\nUMAMI_2FA_KEY=%s\n' \
      "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" > secrets.env )
fi
docker compose --env-file secrets.env up -d
printf 'Démarrage'
for _ in $(seq 60); do
  curl -fs "$LOCAL/api/heartbeat" >/dev/null 2>&1 && break
  printf '.'; sleep 2
done
echo
curl -fs "$LOCAL/api/heartbeat" >/dev/null || stop "Umami ne répond pas : docker logs fondamentalplugin-umami"

etape "3. Compte admin d'Umami"
# Umami démarre avec admin / umami : le mot de passe est changé AVANT d'ouvrir le site sur Internet.
# (identifiants par défaut documentés par Umami, publics : c'est justement ce qu'on remplace)
if printf '{"username":"%s","password":"%s"}' admin umami | api POST /auth/login > "$TMP/login" 2>/dev/null; then
  echo "Mot de passe par défaut détecté : choisis celui du compte « admin » d'Umami (12 caractères minimum)."
  while true; do
    read -rsp "Nouveau mot de passe : " P1; echo
    read -rsp "Encore une fois : " P2; echo
    [ "$P1" = "$P2" ] && [ "${#P1}" -ge 12 ] && break
    echo "Différents ou trop court, recommence."
  done
  printf 'Authorization: Bearer %s\n' "$(json 'd["token"]' < "$TMP/login")" > "$TMP/auth"
  USER_ID=$(json 'd["user"]["id"]' < "$TMP/login")
  P1="$P1" python3 -c 'import json,os; print(json.dumps({"password": os.environ["P1"]}))' | api POST "/users/$USER_ID" >/dev/null
  unset P1 P2
  echo "Mot de passe changé."
else
  read -rsp "Mot de passe actuel du compte « admin » d'Umami : " P1; echo
  P1="$P1" python3 -c 'import json,os; print(json.dumps({"username":"admin","password": os.environ["P1"]}))' \
    | api POST /auth/login > "$TMP/login" || stop "connexion refusée"
  unset P1
  printf 'Authorization: Bearer %s\n' "$(json 'd["token"]' < "$TMP/login")" > "$TMP/auth"
fi

etape "4. Sites suivis (dev et prod)"
site_id() { # site_id NOM DOMAINE : identifiant du site, créé s'il n'existe pas
  local id
  id=$(api GET "/websites?pageSize=100" | json "next((w['id'] for w in d['data'] if w['name']=='$1'), '')")
  if [ -z "$id" ]; then
    id=$(printf '{"name":"%s","domain":"%s"}' "$1" "$2" | api POST /websites | json 'd["id"]')
  fi
  echo "$id"
}
DEV_ID=$(site_id dev dev.fondamentalplugin.fr)
PROD_ID=$(site_id prod fondamentalplugin.fr)
echo "dev  : $DEV_ID"
echo "prod : $PROD_ID (à mettre dans prod/app.env le jour de la mise en production)"

etape "5. nginx et HTTPS"
if [ ! -f /etc/nginx/sites-available/fondamentalplugin-stats ]; then
  curl -fsSL "$SRC/nginx/stats.conf" -o /etc/nginx/sites-available/fondamentalplugin-stats
  ln -sf /etc/nginx/sites-available/fondamentalplugin-stats /etc/nginx/sites-enabled/fondamentalplugin-stats
  nginx -t && systemctl reload nginx
fi
if ! grep -q ssl_certificate /etc/nginx/sites-available/fondamentalplugin-stats; then
  certbot --nginx -d "$DOMAIN" --redirect
fi
curl -fsS "https://$DOMAIN/api/heartbeat" >/dev/null && echo "https://$DOMAIN répond."

etape "6. Site dev branché sur Umami"
for kv in "UMAMI_URL=https://$DOMAIN" "UMAMI_WEBSITE_ID=$DEV_ID"; do
  key=${kv%%=*}
  sed -i "/^$key=/d" "$DEV_DIR/app.env"
  echo "$kv" >> "$DEV_DIR/app.env"
done
cd "$DEV_DIR"
docker compose --env-file .env --env-file secrets.env --env-file deploy.env up -d --force-recreate web

etape "Terminé"
echo "Tableau de bord : https://$DOMAIN (compte admin). Pense à activer la double authentification"
echo "dans Umami : Paramètres → Profil."
