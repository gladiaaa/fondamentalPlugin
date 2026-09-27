# Publier une version d'un plugin

Une nouvelle version d'un plugin (Bedwars, Tag, Crate, Pass) arrive sur le site par l'API, appelée par la CI du dépôt du plugin. Rien à faire à la main sur le serveur.

## Ce qu'il faut

- Le jeton de publication, `RELEASES_TOKEN`, défini dans `api.env` de l'environnement visé (dev ou prod). Au moins 32 caractères : `openssl rand -base64 32`. **Sans lui, la publication est refusée pour tout le monde.**
- Le même jeton comme **secret** du dépôt du plugin (par exemple `FONDAMENTAL_RELEASES_TOKEN`), jamais dans le code ni dans les logs. Un jeton par environnement : celui de dev ne doit pas fonctionner sur la prod.
- Le jar à publier : le `*-obf.jar` (paquet de licence obfusqué), jamais le jar non obfusqué.

## Les deux appels

Les routes ne sont pas dans `openapi.json` : ce ne sont pas des routes du site. Elles ne demandent pas d'en-tête `Origin` (appel de serveur à serveur), seulement le jeton.

### 1. Créer la version (rejouable)

```bash
curl -fsS -X PUT "$API/api/admin/releases/tag/2.2.0" \
  -H "Authorization: Bearer $RELEASES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"RELEASE","changelog":"- Nouveau : ...\n- Corrigé : ..."}'
```

`$API` : `https://dev.fondamentalplugin.fr` ou `https://fondamentalplugin.fr`. Le plugin est désigné par son `slug` : `bedwars`, `tag`, `crate` ou `pass`. La version est un texte libre (lettres, chiffres, `.`, `_`, `-`). `201` à la création, `200` si la version existait (le changelog et le canal sont mis à jour) : on peut donc rejouer sans risque.

### 2. Envoyer chaque jar

```bash
curl -fsS -X POST "$API/api/admin/releases/tag/2.2.0/files" \
  -H "Authorization: Bearer $RELEASES_TOKEN" \
  -F "edition=FREE" \
  -F "minecraft=1.21.4,1.21.5,1.21.8" \
  -F "file=@target/fondamentaltag-free-2.2.0-obf.jar"
```

| Champ | Contenu |
|---|---|
| `file` | le jar ; le **nom du fichier** est celui que verra le client (lettres, chiffres, `.`, `_`, `-`, terminé par `.jar`) |
| `edition` | `UNIVERSAL` pour Bedwars et Pass (un seul jar) ; `FREE` ou `PREMIUM` pour Tag et Crate (**un appel par jar**) |
| `minecraft` | les versions de Minecraft couvertes, séparées par des virgules (1 à 30). Une version inconnue est ajoutée toute seule |

Réponses : `201` avec le fichier publié (l'empreinte SHA-256 et la taille sont **calculées par le serveur**), `401` jeton invalide, `404` plugin ou version inconnus (créer la version d'abord), `400` champ invalide, `409` ce fichier existe déjà pour cette version (un fichier publié n'est jamais écrasé : publier une nouvelle version), `413` fichier trop gros (50 Mo par défaut, `RELEASES_MAX_UPLOAD_MB`), `422` ce n'est pas un plugin (le jar doit contenir `plugin.yml` ou `paper-plugin.yml` à la racine).

## Modèle de workflow pour le dépôt d'un plugin

À adapter dans `.github/workflows/release.yml` du dépôt du plugin, déclenché par une release GitHub. **À valider dans le dépôt du plugin** : ce modèle n'a pas été exécuté ici.

```yaml
name: Publier sur le site
on:
  release:
    types: [published]

jobs:
  site:
    runs-on: ubuntu-latest
    env:
      API: https://fondamentalplugin.fr        # https://dev.fondamentalplugin.fr pour une pré-version
      SLUG: tag                                # bedwars, tag, crate ou pass
      VERSION: ${{ github.event.release.tag_name }}
      TOKEN: ${{ secrets.FONDAMENTAL_RELEASES_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: ./build.sh                         # produit les *-obf.jar (voir le dépôt du plugin)
      - name: Créer la version
        run: |
          curl -fsS -X PUT "$API/api/admin/releases/$SLUG/$VERSION" \
            -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
            -d "$(jq -n --arg c "${{ github.event.release.body }}" '{channel:"RELEASE",changelog:$c}')"
      - name: Envoyer les jars
        run: |
          for jar in target/*-obf.jar; do
            case "$jar" in *-free-*) edition=FREE;; *-premium-*) edition=PREMIUM;; *) edition=UNIVERSAL;; esac
            curl -fsS -X POST "$API/api/admin/releases/$SLUG/$VERSION/files" \
              -H "Authorization: Bearer $TOKEN" \
              -F "edition=$edition" -F "minecraft=1.21.4,1.21.5,1.21.6,1.21.7,1.21.8" -F "file=@$jar"
          done
```

## Modrinth et Spigot

- **Modrinth** a une API de publication : ajouter une étape à ce workflow avec une action de publication (par exemple `Kir-Antipov/mc-publish`), en publiant **le jar Free** pour Tag et Crate, et le jar unique pour Bedwars et Pass, avec un lien vers le site pour passer en premium. Non testé ici.
- **Spigot** n'a pas d'API de publication : mise en ligne manuelle. Vérifier avant de compter dessus que Spigot accepte un plugin réservé à Paper (les 4 plugins ciblent Paper).

Checklist d'une sortie :

- [ ] Jars `*-obf.jar` construits
- [ ] Version créée et jars envoyés sur **dev**, vérifiés sur https://dev.fondamentalplugin.fr (fichiers, SHA-256, téléchargement)
- [ ] Même chose sur la prod
- [ ] Modrinth publié (jar Free)
- [ ] Spigot mis à jour à la main
- [ ] PR wiki et schémas de config de la nouvelle version (#29, #30)
