# Contribuer

## Règles d'or

1. **Personne ne pousse directement sur `main`.** Tout changement passe par une branche puis une pull request.
2. **Une tâche = une issue = une branche = une PR.** On référence l'issue dans la PR (`Closes #12`).
3. **Aucun secret dans le dépôt** : clés Stripe, token du serveur de licences, clés API. Seul `.env.example` (sans valeurs réelles) est versionné.
4. **Pas de fichiers propres à un outil** (config d'éditeur personnelle, fichiers d'instructions d'assistants de code…) : utilisez votre `.git/info/exclude` local.

## Branches

| Préfixe | Usage | Exemple |
|---|---|---|
| `feature/` | Nouvelle fonctionnalité | `feature/page-faq` |
| `fix/` | Correction de bug | `fix/webhook-double-licence` |
| `chore/` | Outillage, dépendances, CI | `chore/maj-next` |
| `docs/` | Documentation | `docs/deploiement` |

## Commits

En français, à l'impératif ou au présent, courts et explicites :

```
Ajoute la page FAQ
Corrige le double envoi de licence au rejeu du webhook
```

## Pull requests

- Description remplie (modèle fourni) : ce qui change, pourquoi, comment tester.
- La CI (lint + build) doit être verte.
- Au moins une relecture avant la fusion.
- Fusion en **squash** pour garder un historique lisible.

## Issues

- Utiliser les modèles « Bug » ou « Fonctionnalité ».
- Étiquettes : `bug`, `enhancement`, `design`, `paiement`, `licences`, `contenu`.
- S'assigner l'issue avant de commencer pour éviter le travail en double.

## Environnement

- Node.js 20 ou plus récent, npm.
- Stripe en **mode test** uniquement en local (cartes de test : `4242 4242 4242 4242`).
- Ne jamais pointer un environnement local vers le serveur de licences de production avec un vrai token : demandez un token de test.
