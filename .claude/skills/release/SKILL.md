---
name: release
description: Préparer une mise en production, c'est-à-dire la pull request dev vers prod avec le résumé des changements. À utiliser quand on demande de mettre en prod, livrer ou publier le site.
---

# Mise en production

La production ne reçoit que des PR `dev` → `prod`. Cette skill prépare la PR ; la fusion reste une décision humaine, après relecture.

1. **Vérifier que `dev` est prêt** :
   - `gh run list --branch dev --limit 3` : la dernière CI et le dernier déploiement dev sont verts ;
   - `curl -s https://dev.fondamentalplugin.fr/api/health` : dev sert bien le dernier commit de `dev`.
2. **Lister ce qui part en production** :
   ```bash
   git fetch origin
   git log --oneline origin/prod..origin/dev
   ```
   S'il n'y a rien, le dire et s'arrêter.
3. **Ouvrir la PR** (ou mettre à jour celle déjà ouverte) :
   ```bash
   gh pr create --base prod --head dev --title "Mise en production : <résumé>" --body "<corps>"
   ```
   Corps : les changements groupés (fonctionnalités, corrections, technique) avec leurs numéros d'issues et de PR, les points à vérifier après le déploiement, et toute action manuelle nécessaire (nouvelle variable dans `app.env`, migration...).
4. Rappeler : fusion en **merge commit** (pas de squash), après au moins une relecture approuvée. Le déploiement et la note de version se font automatiquement ensuite ; `/check-deploy` pour vérifier.
