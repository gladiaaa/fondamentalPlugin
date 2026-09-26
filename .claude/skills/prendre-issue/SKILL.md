---
name: prendre-issue
description: Traiter une issue GitHub de bout en bout (lecture, branche depuis dev, code, vérifications, PR vers dev). À utiliser quand on demande de prendre, faire ou traiter une issue par son numéro.
---

# Prendre une issue

Argument : le numéro de l'issue (`/prendre-issue 12`).

1. **Lire l'issue** : `gh issue view <n°> --comments`. Si elle est floue ou incomplète, poser les questions avant de coder.
2. **S'assigner l'issue** : `gh issue edit <n°> --add-assignee @me`.
3. **Créer la branche depuis `dev` à jour** :
   ```bash
   git fetch origin
   git switch -c <type>/<n°>-<sujet-court> origin/dev
   ```
   Type : `feature` (fonctionnalité), `fix` (bug), `chore` (outillage), `docs`.
4. **Coder** en suivant les conventions de `CLAUDE.md`. Petits commits en français.
5. **Vérifier** : `npm run lint`, `npm run typecheck`, `npm run build`. Tester le parcours concerné avec `npm run dev`.
6. **Pousser et ouvrir la PR vers `dev`** :
   ```bash
   git push -u origin HEAD
   gh pr create --base dev --fill-first
   ```
   Remplir le modèle : ce qui change, pourquoi, comment tester, et `Closes #<n°>`.
7. Donner le lien de la PR. Ne jamais fusionner soi-même sans accord, ne jamais viser `prod`.
