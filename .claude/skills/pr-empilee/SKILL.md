---
name: pr-empilee
description: Ouvrir une pull request empilée sur la dernière branche non fusionnée du projet, pour toute nouvelle tâche tant que les PR précédentes attendent une fusion décidée par un humain. À utiliser à la place de « prendre-issue » quand des PR sont déjà ouvertes vers dev.
---

# PR empilée

Personne (Claude compris) ne fusionne une PR de ce dépôt sans un ordre explicite d'Océane, même après une approbation. Les nouvelles PR s'empilent donc les unes sur les autres au lieu de repartir de `dev` à chaque fois.

1. **Trouver la tête de la pile** (la dernière PR ouverte que rien d'autre ne prend pour base) :
   ```bash
   gh pr list --state open --json number,headRefName,baseRefName
   ```
   Suivre la chaîne des `baseRefName` : la branche qui n'est la base d'aucune autre PR ouverte est la tête. Si aucune PR n'est ouverte, la tête est `dev`.
2. **Créer la nouvelle branche depuis cette tête**, pas depuis `dev` :
   ```bash
   git fetch origin
   git switch -c <type>/<n°>-<sujet> origin/<tête-de-pile>
   ```
3. Travailler, committer (français, impératif ou présent, court), pousser.
4. **Ouvrir la PR avec `--base <tête-de-pile>`** (jamais `dev` tant que la pile n'est pas résorbée), et rappeler en tête de sa description :
   - l'ordre de fusion complet, de la première PR de la pile à la dernière ;
   - qu'après chaque fusion, GitHub redirige la PR suivante vers `dev` (elle peut alors avoir besoin d'un `merge` de `dev` avant de fusionner à son tour).
5. **Ne jamais fusionner.** Donner le lien de la PR et attendre un ordre explicite, même si elle est approuvée et que sa CI est verte.

Si la pile dépasse 4 ou 5 PR, le signaler avant de continuer : proposer d'attendre une fusion plutôt que d'empiler encore, pour limiter les conflits et les rebases en cascade.
