# 0003. Un jar unique pour Free et Premium quand c'est possible

- État : acceptée
- Date : 2026-09-26

## Contexte

Les plugins Fondamental ont une édition gratuite et une édition Premium débloquée par une clé de licence. Le site est la source officielle des jars, publiés aussi sur Modrinth et Spigot pour attirer du public.

## Décision

- **FondamentalBedwars et FondamentalPass** : un seul jar (`SINGLE_JAR`, édition `UNIVERSAL`). Il démarre en Free et passe en Premium quand une clé valide est placée dans son `config.yml`. **Tous les téléchargements sont publics** : c'est la licence qui débloque le Premium, pas le fichier.
- **FondamentalTag et FondamentalCrate** : deux jars, `free` et `premium` (`FREE_PREMIUM_JARS`). Un jar Premium sans clé valide se comporte comme le Free.
- Le site stocke un fichier par édition, par version du plugin et par plage de versions de Minecraft, avec son SHA-256 calculé par le serveur.

## Conséquences

- Aucun contrôle d'accès sur les téléchargements : pas de compte requis, pas de lien à durée limitée. La protection du Premium repose entièrement sur la vérification de la clé par le plugin.
- Le site doit expliquer clairement, pour Tag et Crate, quel jar choisir.
- La publication (`PUT`/`POST /api/admin/releases`) vérifie que l'édition envoyée est cohérente avec la distribution du plugin.
