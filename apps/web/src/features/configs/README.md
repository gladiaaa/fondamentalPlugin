# `features/configs`

Configurateur des fichiers des plugins (#30), page `/configurateur` (réservée aux détenteurs d'une licence du plugin ; `/compte/config` y redirige).

- `Configurator.tsx` : la page (choix du plugin et du fichier, navigation dans le fichier, écran de l'élément choisi, fichier YAML en direct, configurations enregistrées).
- `ConfigFields.tsx` : formulaire généré depuis le schéma de l'API (`ConfigField` dans `@fondamental/shared`).
- `navigation.ts` : chemins du configurateur (une section, une liste, une entrée à la fois).
- `minimessage.ts`, `tag-effects.ts`, `MiniMessagePreview.tsx` : aperçu en couleurs des textes MiniMessage et des tags de FondamentalTag (effets, styles de lettres, animations).

Le fichier YAML est toujours rendu par l'API (`POST /api/me/configs/render`), clé de licence comprise : l'aperçu en couleurs n'est qu'une aide visuelle.
