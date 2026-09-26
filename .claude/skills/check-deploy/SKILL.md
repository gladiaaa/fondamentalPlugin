---
name: check-deploy
description: Vérifier l'état des déploiements dev et prod (version en ligne, derniers workflows, écart avec les branches). À utiliser après une fusion, un déploiement, ou quand le site semble ne pas être à jour.
---

# Vérifier les déploiements

1. **Versions en ligne** :
   ```bash
   curl -s https://dev.fondamentalplugin.fr/api/health
   curl -s https://fondamentalplugin.fr/api/health
   ```
   La version a la forme `<branche>-<commit court>`.
2. **Dernier commit de chaque branche** :
   ```bash
   git fetch origin
   git rev-parse --short=7 origin/dev origin/prod
   ```
   Comparer avec les versions en ligne.
3. **Derniers workflows** : `gh run list --workflow deploy.yml --limit 5`. En cas d'échec : `gh run view <id> --log-failed`.
4. **Résumer** : pour dev et prod, version en ligne, à jour ou non, et la cause probable d'un écart :
   - workflow en cours ou échoué (voir ses logs) ;
   - retour automatique à la version précédente (le site ne répondait pas) : chercher « ne répond pas » dans les logs ;
   - cache DNS local : tester avec `curl --resolve`.

Ne jamais relancer un déploiement de production sans accord.
