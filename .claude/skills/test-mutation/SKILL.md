---
name: test-mutation
description: Vérifier qu'un test (ou un groupe de tests) détecte vraiment les défauts qu'il prétend couvrir, en cassant le code exprès puis en restaurant. À utiliser après avoir écrit des tests pour une route ou un service sensible (sécurité, argent, licences, fichiers).
---

# Test de mutation manuel

Argument : le fichier de code visé et le fichier de test qui doit le surveiller.

1. **Copier le fichier de code avant toute mutation** (`cp fichier.ts /tmp/original.bak`). Ne jamais utiliser `git checkout` pour restaurer : ça écraserait aussi des modifications en cours ailleurs dans le dépôt.
2. **Lister 5 à 10 mutations plausibles** pour ce fichier (une condition inversée, une vérification supprimée, une limite retirée, un filtre élargi…). Une par une :
   - appliquer la mutation (`sed` ou Edit) ;
   - si le fichier n'a pas changé (mutation déjà couverte par le code existant, ou sans effet), le noter « mutation sans effet » et passer à la suivante sans lancer de test ;
   - lancer **seulement les tests concernés** (pas toute la suite) ;
   - noter si un test échoue ;
   - **restaurer immédiatement** depuis la copie avant la mutation suivante.
3. **Une mutation non détectée = un test manquant à écrire**, sauf mutant équivalent (le code change mais le comportement observable est rigoureusement identique — par exemple le nom d'une variable temporaire aléatoire). Le dire explicitement, avec la raison.
4. À la fin, restaurer le fichier depuis la copie et vérifier `git diff` propre avant de continuer à travailler dessus.
5. Dans la description de la PR : « M défauts introduits volontairement, N détectés », avec le détail des mutations non détectées et pourquoi.

Ne jamais laisser une mutation appliquée dans le code final : toujours comparer au fichier de sauvegarde avant de committer.
