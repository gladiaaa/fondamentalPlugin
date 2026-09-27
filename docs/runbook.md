# Runbook : intervenir quand quelque chose casse

À l'usage de la personne d'astreinte. Chaque procédure dit **quand** l'utiliser, **quoi** taper, **comment vérifier**. Les détails de mise en place sont dans [deploy/README.md](../deploy/README.md).

Repères : dans les commandes, `<env>` vaut `dev` ou `prod`. Sur le VPS, tout est dans `/opt/fondamentalplugin/<env>/`. Conteneurs : `fondamentalplugin-<env>` (site), `fondamentalplugin-api-<env>`, `fondamentalplugin-db-<env>`.

> ⚠️ Les procédures marquées **(à venir)** dépendent de fonctions pas encore codées (Stripe #23/#24, serveur de licences #22) : elles décrivent la méthode prévue et sont à valider quand ces fonctions existent.

## 0. Diagnostic rapide

```bash
curl -s https://fondamentalplugin.fr/api/health          # {"ok":true,"version":"prod-abc1234","database":"up"}
docker ps --filter name=fondamentalplugin --format '{{.Names}}  {{.Status}}'
docker logs --tail 100 fondamentalplugin-api-prod        # journaux de l'API
cat /opt/fondamentalplugin/prod/current /opt/fondamentalplugin/prod/previous   # version en ligne / précédente
```

| Symptôme | Cause probable | Aller à |
|---|---|---|
| `/api/health` ne répond pas ou `502` | conteneur `api` arrêté ou en boucle de redémarrage | logs de l'API, puis §2 |
| `"database":"down"` | conteneur `db` arrêté, ou mot de passe qui ne correspond plus | `docker logs fondamentalplugin-db-prod` ; §3 si les données sont abîmées |
| L'API refuse de démarrer | variable d'environnement manquante ou invalide : le message des logs nomme la variable | corriger `api.env` puis §4 |
| Inscription, renvoi du lien ou « mot de passe oublié » répondent `503` | `RESEND_API_KEY` absente ou invalide | §4 |
| Le site s'affiche, `/api/...` non | bloc nginx `/api/` absent ou API arrêtée | `nginx -t`, logs de l'API |

## 1. Déployer

Automatique : un push sur `dev` ou `prod` lance le workflow *Déploiement*, qui construit les images, applique les migrations, redémarre et vérifie `/api/health`. Suivre : *Actions → Déploiement*.

Relancer sans nouveau commit :

```bash
gh workflow run deploy.yml --ref dev      # ou prod
```

Mettre en production = une PR `dev` → `prod` (merge commit), jamais un push direct. Si le déploiement échoue avant les migrations, la version en ligne n'a pas bougé ; s'il échoue après, `deploy.sh` a remis la version précédente.

## 2. Revenir à la version précédente

**Quand** : une version fraîchement déployée se comporte mal alors que `/api/health` répond (le retour est automatique quand elle ne répond pas).

```bash
cd /opt/fondamentalplugin/prod
sudo -u deploy ../deploy.sh deploy prod "$(cat previous)" < /dev/null
```

**Vérifier** : `curl -s https://fondamentalplugin.fr/api/health` annonce l'ancienne version.

⚠️ Les migrations de la version annulée **restent appliquées**. Ce n'est sans danger que si elles sont compatibles avec l'ancienne API (règle des migrations). En cas de doute sur une migration, ne pas revenir en arrière : corriger en avant.

## 3. Restaurer une sauvegarde de la base

**Quand** : données perdues ou corrompues. La sauvegarde est faite chaque nuit à 3 h 30, gardée 14 jours dans `/var/backups/fondamentalplugin/<env>/`.

```bash
ENV=prod
ls -1t /var/backups/fondamentalplugin/$ENV/ | head            # choisir le fichier
FILE=/var/backups/fondamentalplugin/$ENV/<fichier>.dump

/opt/fondamentalplugin/restore-test.sh "$FILE"               # 1. vérifier d'abord, sans toucher à la base en service

docker stop fondamentalplugin-api-$ENV                       # 2. couper l'API
docker exec -i fondamentalplugin-db-$ENV pg_restore -U fondamental -d fondamental --clean --if-exists --no-owner < "$FILE"
docker start fondamentalplugin-api-$ENV                      # 3. relancer
```

**Vérifier** : `/api/health` indique `"database":"up"` ; se connecter avec un compte connu.

**Ce qui est perdu** : tout ce qui a été écrit entre la sauvegarde et l'incident (nouveaux comptes, commandes). Avec Stripe (à venir), rejouer les événements de la période (§6) reconstitue les commandes.

**Contrôle mensuel** : lancer `restore-test.sh` sur la dernière sauvegarde de prod et vérifier que les tables ont des lignes.

⚠️ Les sauvegardes sont **sur le VPS** : si le serveur est perdu, elles le sont aussi (copie externe : issue #41).

## 4. Changer (faire tourner) un secret

Les secrets ne sont **jamais dans le dépôt** : ils sont dans des fichiers lisibles par `root` et `deploy` sur le VPS, et dans les secrets GitHub pour le déploiement.

| Secret | Où | Comment |
|---|---|---|
| `POSTGRES_PASSWORD` | `/opt/fondamentalplugin/<env>/secrets.env` | voir ci-dessous (change aussi le mot de passe dans la base) |
| `RESEND_API_KEY`, `RELEASES_TOKEN`, `SENTRY_DSN`, futurs `STRIPE_*`, `LICENSE_*` | `/opt/fondamentalplugin/<env>/api.env` | modifier le fichier, puis redémarrer l'API |
| `RELEASES_TOKEN` (suite) | secret du dépôt de **chaque plugin** (GitHub) | le remplacer aussi, sinon la CI ne peut plus publier |
| `DEPLOY_SSH_KEY` | secret GitHub + `authorized_keys` du compte `deploy` | générer une nouvelle paire, remplacer les deux, supprimer l'ancienne clé |

Redémarrer l'API pour lire un nouveau `api.env` :

```bash
cd /opt/fondamentalplugin/<env>
sudo -u deploy ../deploy.sh deploy <env> "$(cat current)" < /dev/null
curl -s http://127.0.0.1:<API_PORT>/api/health    # 4101 (dev) ou 4100 (prod)
```

Générer un jeton : `openssl rand -base64 32` (le jeton de publication fait au moins 32 caractères).

**Mot de passe de la base** (procédure plus rare) : changer le mot de passe dans PostgreSQL **et** dans `secrets.env`, puis redéployer.

```bash
NEW=$(openssl rand -hex 24)
docker exec fondamentalplugin-db-<env> psql -U fondamental -d fondamental -c "ALTER USER fondamental PASSWORD '$NEW'"
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW/" /opt/fondamentalplugin/<env>/secrets.env
# puis redéployer comme ci-dessus
```

**Secret fuité** (dans un dépôt, un ticket, une capture) : le considérer comme compromis, le **remplacer d'abord**, nettoyer ensuite. Un secret retiré d'un commit reste dans l'historique.

Effets d'un changement : `RELEASES_TOKEN` : publications refusées tant que les dépôts n'ont pas le nouveau ; `RESEND_API_KEY` : e-mails en `503` tant que l'API n'est pas redémarrée avec la bonne clé.

## 5. Rejouer un événement du webhook Stripe

**Quand** : un paiement a réussi chez Stripe mais le client n'a pas reçu sa clé (webhook en échec, serveur de licences indisponible pendant le paiement).

1. Dashboard Stripe → *Développeurs → Webhooks* → le point de terminaison → l'événement `checkout.session.completed` concerné → **Renvoyer**.
2. Le traitement est **idempotent** : `stripe_checkout_session_id` est unique. Si la commande est déjà « licensed », l'API répond `200` sans rien faire ; sinon elle crée la licence et passe la commande en « licensed » (l'e-mail avec la clé n'est pas encore envoyé : suite de #26).
3. En dev, avec la CLI : `stripe events resend <evt_…>`.

**Vérifier** : la commande est « licensed » (`GET /api/orders/by-session/:id`) et la clé apparaît dans « mes licences » du client.

Stripe réessaie tout seul plusieurs jours quand l'API répond `500` : ne rejouer à la main qu'après avoir corrigé la cause.

**Pas encore utilisable en ligne** : `POST /api/checkout` répond `503` (`PAYMENT_UNAVAILABLE`) tant que `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` ne sont pas configurées et que les produits n'ont pas de `stripe_price_id` (voir #23/#24).

## 6. Révoquer ou recréer une licence à la main

**Quand** : un remboursement est manqué par le webhook (`charge.refunded` non reçu), clé fuitée, litige. D'ordinaire, un remboursement Stripe révoque la licence et passe la commande en « refunded » tout seul (voir section 5).

Les appels manuels passent par l'API d'administration du serveur de licences, via `LicenseServerClient` (`get`/`create`/`revoke`/`releaseActivation`, #22) ou directement :

```bash
# Depuis le VPS (les valeurs sont dans api.env : ne jamais les coller dans une issue ou un message)
curl -sS -X POST "$LICENSE_SERVER_URL/api/v1/admin/licenses/<CLE>/revoke" \
  -H "Authorization: Bearer $LICENSE_ADMIN_TOKEN"
```

Ensuite, passer la commande en « refunded » en base (le back-office admin, #32, remplacera cette étape manuelle). Libérer une installation : `DELETE …/licenses/<CLE>/activations/<installationId>`.

## 7. Supprimer un compte à la demande (RGPD)

Le client peut le faire lui-même (`DELETE /api/me`). Si c'est impossible (compte sans mot de passe, accès perdu), un administrateur peut le faire en base, **après avoir vérifié l'identité du demandeur par e-mail** :

```bash
docker exec -it fondamentalplugin-db-prod psql -U fondamental -d fondamental \
  -c "DELETE FROM users WHERE email = 'client@exemple.fr'"   # supprime aussi sessions et liens (cascade)
```

Quand les commandes existeront (#23), elles devront être **anonymisées et conservées** (obligation comptable), pas supprimées : cette procédure sera alors mise à jour.

## 8. Après l'incident

- Noter dans une issue : ce qui s'est passé, la cause, ce qui a été fait.
- Si une procédure de ce document s'est révélée fausse ou incomplète, **la corriger dans la même journée**.
