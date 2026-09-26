# Contribuer

## Branches

```
feature/12-page-faq ──PR (squash)──▶ dev ──PR (merge)──▶ prod
                                      │                   │
                         dev.fondamentalplugin.fr   fondamentalplugin.fr
```

| Branche | Rôle | Règles |
|---|---|---|
| `prod` | Production : ce qui tourne sur **fondamentalplugin.fr** | Aucun push direct. PR **uniquement depuis `dev`**, CI verte, 1 relecture approuvée. Pas de force-push ni de suppression. |
| `dev` | Intégration (branche par défaut) : ce qui tourne sur **dev.fondamentalplugin.fr** | Push direct possible pour une retouche, mais on passe normalement par des branches et des PR. Pas de force-push ni de suppression. |
| `feature/…`, `fix/…`, `chore/…`, `docs/…` | Une tâche | Partent de `dev`, reviennent dans `dev` par PR. |

Chaque push sur `dev` ou `prod` déploie automatiquement le site correspondant (voir [deploy/README.md](deploy/README.md)).

## Le circuit d'une tâche

1. **Issue** : tout commence par une issue (modèles « Bug » ou « Fonctionnalité »). On se l'assigne avant de commencer.
2. **Branche** depuis `dev`, avec le numéro de l'issue : `feature/12-page-faq`, `fix/31-panier-vide`.
3. **Pull request** vers `dev`, avec `Closes #12` dans la description : l'issue se ferme toute seule à la fusion.
4. **CI verte** + relecture, puis fusion en **squash** (un commit propre par tâche).
5. Vérification sur **dev.fondamentalplugin.fr**.
6. **Mise en production** : une PR `dev` → `prod`, fusionnée en **merge commit** (pas de squash, sinon `dev` et `prod` divergent). Elle déploie le site et publie une note de version.

**Correctif urgent** : branche `fix/…` → PR vers `dev` → PR `dev` → `prod`. Pas de raccourci vers `prod`.

## Règles d'or

1. **Aucun secret dans le dépôt** : clés Stripe, token du serveur de licences, clés API. Seul `.env.example` (sans valeurs réelles) est versionné. Les secrets de production vivent sur le VPS et dans les secrets GitHub.
2. **Une tâche = une issue = une branche = une PR.**
3. Fichiers personnels (config d'éditeur, réglages locaux d'outils comme `.claude/settings.local.json`) : dans votre `.git/info/exclude`, pas dans le dépôt. `CLAUDE.md` et `.claude/skills/` sont partagés et versionnés.

## Commits

En français, à l'impératif ou au présent, courts et explicites :

```
Ajoute la page FAQ
Corrige le double envoi de licence au rejeu du webhook
```

## Pull requests

- Description remplie (modèle fourni) : ce qui change, pourquoi, comment tester.
- La CI doit être verte : lint, types, build et image Docker.
- Au moins une relecture approuvée pour aller en `prod`.

## Issues et suivi

- Tableau du projet : **Backlog → À faire → En cours → En revue → Terminé**.
- Étiquettes : type (`bug`, `enhancement`, `chore`, `docs`), domaine (`design`, `paiement`, `licences`, `contenu`, `infra`), priorité (`priorité: haute` / `basse`).

## Environnement

- Node.js 22, npm, Docker (pour tester l'image : `docker build -t fondamentalplugin .`).
- Stripe en **mode test** uniquement en local (carte de test : `4242 4242 4242 4242`).
- Ne jamais pointer un environnement local vers le serveur de licences de production avec un vrai token : demandez un token de test.
