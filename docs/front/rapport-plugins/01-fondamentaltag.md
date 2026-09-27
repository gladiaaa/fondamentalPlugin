# 🏷️ FondamentalTag — rapport détaillé

**Version analysée** : 2.2.0 (`pom.xml`) · **Paper** 1.21.x · **Java** 21 · **Jars** : `fondamentaltag-free-2.2.0` / `fondamentaltag-premium-2.2.0` (distribuer les `-obf.jar`)
**Successeur de « TagsCustom 1.x »** (migration automatique, clé de licence reprise ; ID produit de licence : `tagcustom`).

---

## 1. En bref

Tags de joueur (`[VIP]`, `[Fondateur]`…) affichés **dans le chat, au-dessus de la tête, dans la liste TAB** et via PlaceholderAPI. Les joueurs les choisissent dans un **menu**, les administrateurs les **vendent ou offrent en une commande** (idéal Tebex). En Premium : dégradés, **tags animés**, effets générés lettre par lettre, **pack de ressources** qui anime les tags partout (chat compris), boutique, tags temporaires, éditeur en jeu, MySQL réseau.

Deux « produits » dans le même plugin :
1. **Le catalogue de tags** défini par le propriétaire (`tags.yml`) ;
2. **L'Atelier** (`customization.yml`) où **chaque joueur compose son propre tag** à partir de pièces (titre, couleur, effet, style, badge, cadre) achetées en points / argent Vault / PlayerPoints.

---

## 2. Vu du joueur (expérience)

| Action | Comment |
|---|---|
| Ouvrir le menu | `/tag` (alias `/tags`, `/ftag`) |
| Naviguer | Menu des **catégories** (avec barre de progression « débloqués / total ») → liste des tags paginée. En-tête = **tête du joueur** (clic = retirer son tag). Bouton « **Mes tags** » (catégorie virtuelle) et filtre « **débloqués seulement** ». |
| Voir l'état d'un tag | **Équipé**, **débloqué**, **verrouillé** (grisé), **à acheter** (prix affiché), **Premium** (grisé, si Free et `menu.show-premium`) |
| Équiper | Clic sur un tag débloqué, ou `/tag equip <id>` / `/tag <id>` |
| **Aperçu animé** | **Clic droit** sur n'importe quel tag ou pièce (même non débloqué) → animation 6 s dans la barre d'action |
| Retirer | `/tag remove` (ou clic sur sa tête) |
| Lister | `/tag list` (tags cliquables pour équiper) |
| Acheter un tag (Premium) | Clic → **second clic dans les 5 s** pour confirmer (évite les achats par erreur). Prix `0` = « récupérer gratuitement ». |
| Atelier | `/tag atelier` ou bouton du menu ; aperçu **en direct** ; achat = 2e clic ; une pièce achetée est à vie |
| Solde | `/tag points` |
| Pack de ressources | `/tag pack` (renvoie le pack, Premium) |

**Où le tag apparaît** : chat (format intégré ou via placeholder), au-dessus de la tête et dans le TAB (préfixe d'équipe scoreboard), et partout où `%fondamentaltag_…%` est utilisable (scoreboard, TAB, hologrammes…). Les tags animés défilent au-dessus de la tête/TAB/placeholders ; **dans le chat, un message garde la frame du moment de l'envoi** — sauf avec le **pack de ressources** (shaders) où l'animation reste vivante dans le chat.

Retours : son à l'équipement/achat (`menu.sounds.*`), titre à l'achat, message à l'expiration d'un tag temporaire (`tag-expired`).

---

## 3. Vu de l'administrateur

### 3.1 Installation
1. Déposer le jar (`-free` ou `-premium`) dans `plugins/`.
2. Démarrer : `config.yml`, `tags.yml`, `customization.yml`, `messages.yml` sont créés dans `plugins/FondamentalTag/`.
3. **Premium** : `license.key` dans `config.yml` → `/tag reload` puis `/tag license check` (ou redémarrer).
4. Éditer `tags.yml` → `/tag reload`.

### 3.2 Commandes
Alias `/tags`, `/ftag`. Les commandes d'administration fonctionnent depuis la **console**.

**Joueurs** (`fondamentaltag.use`, tout le monde) : `/tag`, `/tag equip <tag>` (ou `/tag <tag>`), `/tag remove`, `/tag list`, `/tag atelier` (`fondamentaltag.atelier`), `/tag points`, `/tag pack`, `/tag help`.

**Administration** (`fondamentaltag.admin`, op) :

| Commande | Effet | Édition |
|---|---|---|
| `/tag give <joueur> <tag>` | Donne définitivement | Free + Premium |
| `/tag give <joueur> <tag> <durée>` | Tag **temporaire** (`30m`, `12h`, `7d`, `1w`, `1d12h`, `j` accepté). Redonner **prolonge**. | **Premium** |
| `/tag take <joueur> <tag>` | Reprend | Free + Premium |
| `/tag set <joueur> <tag\|none>` | Impose un tag (et le donne si besoin) | Free + Premium |
| `/tag info <joueur>` | Tag porté, débloqués, expirations *(joueur **en ligne**)* | Free + Premium |
| `/tag points <give\|take\|set> <joueur> <n>` | Points internes (économie `internal` seulement) | Free + Premium |
| `/tag unlock <joueur> <famille> <pièce>` | Offre une pièce d'Atelier | Free + Premium |
| `/tag atelier reset <joueur>` | Réinitialise le tag perso | Free + Premium |
| `/tag create <id> <catégorie> <affichage>` | Crée un tag (écrit dans `tags.yml`) | **Premium** |
| `/tag edit <id> <affichage>` | Modifie l'affichage | **Premium** |
| `/tag delete <id>` | Supprime et **retire à tous les joueurs** | **Premium** |
| `/tag preview <affichage\|id>` | Aperçu d'un rendu MiniMessage ou d'un tag ; indique s'il est **compatible Free** | Free + Premium |
| `/tag reload` | Recharge config, tags, messages ; réapplique aux joueurs en ligne | Free + Premium |
| `/tag license [check]` | Statut / revérification | Free + Premium |

Pour `give`/`take`/`set`/`unlock`/`points`, le joueur cible doit avoir **déjà rejoint** le serveur au moins une fois (résolution par le cache Bukkit).

### 3.3 Permissions
| Permission | Défaut | Effet |
|---|---|---|
| `fondamentaltag.use` | tous | Menu, équiper, retirer, lister |
| `fondamentaltag.atelier` | tous | Utiliser l'Atelier |
| `fondamentaltag.admin` | op | Toutes les commandes admin (inclut `use` et `atelier`) |
| `fondamentaltag.tag.<id>` | — | Débloque le tag `<id>` (ou la permission définie dans `tags.yml`) |

**Règle d'accès à un tag** : un joueur peut l'utiliser s'il est **public** (`permission: ""`), s'il a **sa permission**, ou s'il le **possède** (acheté, gagné en crate, donné par `/tag give`). ⚠️ Contrairement à TagsCustom 1.x, les permissions **sont vérifiées**.

### 3.4 Placeholders (PlaceholderAPI, identifiant `fondamentaltag`)
| Placeholder | Résultat |
|---|---|
| `%fondamentaltag_tag%` | Tag porté (couleurs §) ou `placeholders.no-tag` |
| `%fondamentaltag_tag_prefix%` | Tag + espace, ou rien → **à mettre dans les formats de chat** |
| `%fondamentaltag_tag_raw%` | Tag en **MiniMessage** (TAB, plugins compatibles) |
| `%fondamentaltag_tag_plain%` | Sans couleurs |
| `%fondamentaltag_tag_id%` / `_tag_category%` | Identifiant / catégorie du tag porté |
| `%fondamentaltag_unlocked%` / `_total%` | Nb de tags débloqués / utilisables |
| `%fondamentaltag_has_<id>%` | `true` / `false` |
| `%fondamentaltag_id_<n>%` | Le tag dont `numeric-id` = n |
| `%fondamentaltag_points%` | Solde Atelier |
| `%fondamentaltag_edition%` | `Free` / `Premium` |

Compatibilité anciens placeholders `%tags_Player_tag%`, `%tags_id_N%` avec `placeholders.legacy-identifier: true`.

### 3.5 Intégrations chat / TAB
- **EssentialsChat** : `chat.enabled: false` dans Tag, puis dans `Essentials/config.yml` → `chat.format: '%fondamentaltag_tag_prefix%{DISPLAYNAME}&7: &f{MESSAGE}'` (nécessite PlaceholderAPI et, selon la version, l'expansion « Essentials » ou un plugin qui applique PAPI au chat).
- **LPC / ChatControl / VentureChat** : `chat.enabled: false` + `%fondamentaltag_tag_prefix%` dans leur format.
- **TAB (NEZNAMY)** : `nametag.enabled: false` + `%fondamentaltag_tag_prefix%` dans `tagprefix`/`tabprefix`.
- **Serveurs de mini-jeux (Bedwars…)** : Tag **ne retire jamais** un joueur d'une équipe scoreboard d'un autre plugin ; y mettre `nametag.enabled: false` et utiliser les placeholders.

---

## 4. Personnalisation — les fichiers

Fichiers créés dans `plugins/FondamentalTag/` : `config.yml`, `tags.yml`, `customization.yml`, `messages.yml` + générés : `tags.db` (SQLite), `resourcepack.zip` (Premium), `license-installation.id`, `license-cache.properties`.

### 4.1 `tags.yml` — le catalogue

Structure : `rarities:` (raretés) puis `categories:` → `<catégorie>` → `tags:` → `<id-tag>`. Identifiant de tag : lettres, chiffres, `_`, `-` (max 64).

**Champs communs d'un tag** : `permission` (défaut `fondamentaltag.tag.<id>` ; `""` = public), `description` (liste), `icon` (Material), `numeric-id` (pour `%fondamentaltag_id_N%`).

**Quatre façons de définir l'apparence** :

| Mode | Syntaxe | Édition |
|---|---|---|
| 1. Écrit à la main | `display: "<gold><bold>[King]</bold></gold>"` | Free (unis seulement) / Premium (tout MiniMessage) |
| 2. **Généré par effet** | `text`, `effect`, `colors`, `style`, `format`, `bold`, `italic`, `font`, `shadow`, `speed`, `motion`, `highlight`, `spread`, `frames`, `pause` | **Premium** |
| 3. Animé à la main | `frames: [...]` + `interval: 8` (ticks, 20 = 1 s) | **Premium** |
| 4. Boutique / rareté / saison | `price`, `rarity`, `event:` (s'ajoute à n'importe quel tag) | `rarity`+`event` : Free+Premium ; **`price` : Premium** |

Exemple (mode 2) :
```yaml
      fondateur:
        text: "Fondateur"
        style: smallcaps                 # ᴘᴇᴛɪᴛᴇꜱ ᴄᴀᴘɪᴛᴀʟᴇꜱ
        effect: shine                    # reflet qui balaie le texte
        colors: ["#FFF3B0", "#FFC837", "#FF8008"]
        bold: true
        format: "<color:#FFD54F>♛</color> {text}"   # {text} = le texte généré
```

**Effets** (`effect:`) — les dégradés sont calculés **lettre par lettre en espace OKLab** (transitions vives, sans zone grise) :

| Effet | Rendu |
|---|---|
| `solid` | 1re couleur unie (utile avec un `style`) |
| `gradient` | Dégradé fixe |
| `wave` | Le dégradé défile en boucle (`spread` = largeur) |
| `rainbow` | Arc-en-ciel qui défile |
| `shine` | Un reflet (`highlight`, blanc par défaut) balaie le texte puis pause (`pause`) |
| `pulse` | La couleur « respire » vers `highlight` |
| `flicker` | Néon qui grésille |
| `fade` | Fondu d'une couleur à l'autre |
| `glitch` | Des lettres sautent brièvement de couleur |
| `sparkle` | Des lettres s'illuminent au hasard |
| `fire` | Chaque lettre ondule dans la palette (flammes) |
| `strobe` | Bascule franche 1re ↔ dernière couleur |

**Mouvements** (`motion:`, **nécessitent le pack de ressources**) : `bounce`, `shake`, `float`, `sway`, `jump`.

**Styles de lettres** (`style:`, vrais caractères Unicode, **sans pack**) : `smallcaps` (ᴠɪᴘ), `bold` (𝐕𝐈𝐏), `sans` (𝗩𝗜𝗣), `italic` (𝘝𝘐𝘗), `script` (𝓥𝓘𝓟), `fraktur` (𝖁𝕴𝕻), `double` (𝕍𝕀ℙ), `mono` (𝚅𝙸𝙿), `fullwidth` (ＶＩＰ). *Les accents sont supprimés (ces alphabets n'en ont pas).* Autres options : `font` (`uniform`, `alt`…), `shadow` (ombre colorée, Paper 1.21.4+), `speed` (ticks entre frames, défaut 2).

**Catalogue livré par défaut** : catégories *Basiques* (`member`, `friend`), *Nature* (`forest`, `ocean`, `frost`), *Éléments* (`fire`, `flame`, `thunder`), *Grades* (`vip`, `vip_plus`, `vip_plus_plus`, `fondateur`, `admin`, `modo`, `helper`, `builder`, `streamer`), *Effets* (`legende`, `demon`, `glace`, `neon`, `aurore`, `crepuscule`, `etincelle`, `brasier`), *Polices* (11 démos d'alphabets/ombre), *Boutique & saisons* (`etoile`, `halloween_2026`, `noel_2026`).

**Boutique, raretés, saisons**

```yaml
rarities:
  legendaire: { display: "<gradient:#FFD700:#FF8C00>Légendaire</gradient>", order: 4 }   # order plus grand = plus rare

      halloween_2026:
        text: "Halloween"
        effect: flicker
        colors: ["#FF7B00", "#8B00FF"]
        price: 500              # en vente (Premium) ; 0 = gratuit ; sans price = pas en vente
        rarity: evenement
        event:
          name: "<gold>Halloween 2026"
          start: "2026-10-15"   # AAAA-MM-JJ ou "AAAA-MM-JJ HH:MM" (heure du serveur)
          end: "2026-11-05"     # sans heure = jusqu'à la fin du jour
          after: keep           # keep = édition limitée gardée ; remove = retiré à tous
```
Raretés par défaut : `commun`(1), `rare`(2), `epique`(3), `legendaire`(4), `mythique`(5), `evenement`(6). `menu.sort-by-rarity: true` affiche les plus rares en premier. **Avant et après son événement, un tag saisonnier n'apparaît que chez ceux qui le possèdent** (objet de collection).

| Besoin | Configuration |
|---|---|
| Réservé à un grade | `permission` seulement |
| En vente toute l'année | `price: 250` |
| Offert pendant les fêtes | `price: 0` + `event` |
| Payant, gardé ensuite | `price: 500` + `event` + `after: keep` |
| Disparaît après l'événement | `event` + `after: remove` (un tag acheté **expire** à la fin de l'événement) |
| À gagner en crate uniquement | ni `price` ni permission ; récompense `type: tag` dans Crate |

### 4.2 `customization.yml` — l'Atelier

Le joueur compose : **titre + couleur + effet + style + badge + cadre**, puis règle vitesse (lente/normale/rapide), sens de défilement, couleur du badge/cadre, position du badge. Le **propriétaire décide de tout** : pièces proposées, prix (`cost`), permission éventuelle (`permission`, pour vendre en boutique ou réserver à un grade), nom (`name`), icône (`icon`). Chaque famille ou l'Atelier entier se désactive (`enabled: false`).

- **Monnaie** (`economy.provider`) : `internal` (points du plugin, donnés par `/tag points give`, + récompense de temps de jeu `playtime-reward` : 5 points / 10 min par défaut), `vault`, `playerpoints`.
- **Familles** : `titles` (28 titres par défaut, de « Joueur » gratuit à « Mythique » 2500), `colors` (30 couleurs/dégradés), `effects` (17), `styles` (11), `badges` (21), `frames` (14 cadres).
- **Dégradé sur mesure** (`custom-gradient`, **Premium**) : le joueur assemble 2–3 de ses couleurs unies ; prix par défaut 500.
- **Sécurité** : le titre vient **uniquement de la liste du propriétaire** → aucun texte libre, donc aucun risque d'insulte.
- **Free vs Premium détecté automatiquement par pièce** : couleur à ≥ 2 teintes, effet ≠ `gradient/solid` ou avec `motion`, style ≠ `none`, badge avec symbole → **Premium** (verrouillé en Free). Titres, couleurs unies, cadres, « Normal » et « Gras » → Free.
- Avec le pack, **toutes les combinaisons** s'animent dans le chat (la couleur du tag encode sa recette — palette et effet — sans régénérer le pack) ; limites du pack : **64 variantes**, **31 couleurs distinctes**.

### 4.3 `config.yml` — clés principales
| Clé | Rôle |
|---|---|
| `license.key` / `check-interval-hours` (6) / `grace-hours` (72) | Licence |
| `database.type` | `sqlite` (défaut) ou `mysql` (**Premium**) + bloc `database.mysql.*` |
| `chat.enabled` / `chat.format` / `chat.tag-format` | Format de chat intégré ; variables `{tag}`, `<player>`, `<message>` |
| `nametag.enabled` / `nametag.format` / `cleanup-legacy-teams` | Tag sur la tête + TAB (équipes scoreboard préfixées `ft_`) |
| `placeholders.no-tag` / `legacy-identifier` | Valeur sans tag / compat `%tags_…%` |
| `menu.show-locked` / `show-premium` / `skip-single-category` / `close-on-equip` / `sort-by-rarity` | Comportement des menus |
| `menu.items.*` / `menu.sounds.*` | Matériaux et sons (`""` = aucun son) |
| `resource-pack.*` | Pack de ressources (Premium), voir §4.5 |
| `colors.*` | Charte de couleurs |

### 4.4 `messages.yml`
Tous les textes (menus compris), MiniMessage, variables `{tag}`, `{player}`, `{time}`, `{price}`… Valeur vide = message désactivé. Repli sur les textes du jar pour les clés absentes.

### 4.5 Pack de ressources (Premium)
`resource-pack.enabled: true` : le plugin **génère** le pack d'après `tags.yml`/Atelier, l'**héberge lui-même** (serveur HTTP intégré, port **8095** par défaut à ouvrir dans le pare-feu, `host.public-url` à renseigner) ou l'envoie depuis `external-url`, puis l'**envoie à la connexion** (`send-on-join`, `required` = kick si refus). Un joueur **sans le pack** voit la couleur principale du tag. Les shaders visent **Minecraft 1.21.11** ; les autres versions reçoivent un **pack vide** (couleur principale, jamais de texte cassé). Effets « motion » uniquement avec le pack.

---

## 5. Données et « JSON »

Tag **n'utilise pas de fichiers JSON**. Base **SQLite** (`plugins/FondamentalTag/tags.db`) ou **MySQL** (Premium). Une seule connexion sur un **thread dédié** ; cache mémoire par joueur → **aucune requête SQL sur le thread principal**.

| Table | Contenu |
|---|---|
| `player_tags` | `uuid`, `active_tag` (tag porté) — schéma repris de TagsCustom |
| `player_owned_tags` | `uuid`, `tag_id`, `expires_at` (0/NULL = permanent) |
| `player_unlocks` | pièces d'Atelier débloquées (`uuid`, `piece`) |
| `player_custom` | tag perso du joueur (`data` texte ≤ 512) |
| `player_points` | solde de points internes |

Les tags de la base restent **en base** si la licence expire ; ils réapparaissent dès qu'elle redevient valide.

---

## 6. Free vs Premium

| Fonction | Free | Premium |
|---|:---:|:---:|
| Tags unis (couleurs nommées/hex, gras, italique, souligné, barré) | ✅ | ✅ |
| Menus, chat, nametag, TAB, PlaceholderAPI | ✅ | ✅ |
| Permissions par tag, `/tag give` permanent, `take`, `set`, `info` | ✅ | ✅ |
| Raretés + tags saisonniers | ✅ | ✅ |
| Atelier : titres, couleurs unies, cadres | ✅ | ✅ |
| Dégradés, arc-en-ciel, effets MiniMessage | ❌ | ✅ |
| Tags animés + effets générés (12 effets) + mouvements | ❌ | ✅ |
| Styles Unicode, polices, ombre colorée | ❌ | ✅ |
| Tags **temporaires** (`/tag give … 7d`) | ❌ | ✅ |
| Boutique en jeu (`price`) | ❌ | ✅ |
| Éditeur en jeu (`create` / `edit` / `delete`) | ❌ | ✅ |
| Atelier : dégradés, dégradé sur mesure, effets, styles, badges | ❌ | ✅ |
| **MySQL** (tags partagés sur un réseau) | ❌ (retombe sur SQLite) | ✅ |
| **Pack de ressources** (animations partout, chat compris) | ❌ | ✅ |

**Comportements en Free** (vérifiés) : les tags Premium restent **visibles mais grisés** (`menu.show-premium`) ; `equip` répond « ce tag nécessite Premium » ; `/tag give` avec durée, `create/edit/delete` répondent « fonction Premium » ; `database.type: mysql` → avertissement + SQLite ; pack désactivé. `/tag preview` indique si un rendu est **compatible Free**. Un tag est utilisable en Free s'il n'a **qu'une frame**, n'est pas « généré » et n'emploie que des balises `<couleur nommée/hex>`, `<bold>`, `<italic>`, `<underlined>`, `<strikethrough>`, `<reset>` (`<color:#a:#b>` = dégradé → refusé).

**Passage Free → Premium en cours de route** : le plugin recharge tags, Atelier et pack **sans redémarrage** ; seul **MySQL** demande un redémarrage (message explicite). La vérification de licence est **bloquante au premier démarrage** d'un jar Premium sans cache (13 s max).

---

## 7. Wiki d'utilisation (recettes)

### A. Créer un tag simple
```yaml
categories:
  grades:
    display: "<gold>Grades</gold>"
    icon: DIAMOND
    tags:
      vip:
        display: "<green><bold>[VIP]</bold></green>"
        permission: "boutique.tag.vip"      # ou "" pour tous
```
`/tag reload` → `/tag equip vip` (le joueur doit avoir la permission ou le tag).

### B. Créer un tag animé (Premium)
Voir l'exemple `fondateur` (§4.1). Tester : `/tag preview fondateur` (animation 6 s dans la barre d'action).

### C. Vendre un tag sur Tebex
Commande de livraison : `tag give {username} king 30d` (30 jours) ou `tag give {username} king` (à vie). Le joueur doit avoir déjà rejoint le serveur une fois. Un tag temporaire **expire tout seul** (vérification toutes les 30 s pour les joueurs en ligne) ; redonner le même tag **prolonge**.

### D. Boutique en jeu avec monnaie du serveur
1. `customization.yml` → `economy.provider: vault` (ou `playerpoints`).
2. Dans `tags.yml`, ajouter `price: 250` au tag (Premium).
3. Le joueur clique le tag, clique **à nouveau dans les 5 s** pour confirmer.

### E. Événement saisonnier
Ajouter `event:` (dates) + `price` + `after: keep|remove` (voir §4.1). Le tag n'apparaît dans les menus **que pendant l'événement** (sauf pour les possesseurs).

### F. Brancher le chat d'Essentials
Voir §3.5. Vérifier PlaceholderAPI installé.

### G. Réseau multi-serveurs
Premium : `database.type: mysql` + identifiants ; **même base sur chaque serveur** ; redémarrer. Les tags, points et **tag personnalisé** suivent le joueur sur tout le réseau.

### H. Activer le pack de ressources (Premium)
`resource-pack.enabled: true` ; ouvrir le port `8095` ; renseigner `host.public-url: "http://IP:8095"` (ou `external-url`) ; `/tag reload`. Les joueurs reçoivent le pack à la connexion (`/tag pack` pour le renvoyer).

### I. Migrer depuis TagsCustom 1.x
Rien à faire à la main : au 1er démarrage, si `plugins/TagsCustom/` existe → tags, icônes de catégories, base (`tags.db` ou MySQL), **clé de licence**, identifiant d'installation, joueurs importés ; `chat.enabled` et `nametag.enabled` passent à `false` (TagsCustom n'affichait le tag que via PAPI) ; anciens `%tags_…%` conservés si `legacy-identifier: true`. L'ancien dossier n'est **pas modifié** (à supprimer après vérification).

### J. Donner un tag depuis une crate
Dans `crates.yml` (Crate) : `- { type: tag, tag: frost, duration: 7d }`. Rareté du tag reprise automatiquement.

### K. API pour développeurs (`fr.fondamental.tag.api.FondamentalTagApi`)
Méthodes **statiques** (types Java uniquement, appelables par réflexion sans dépendre du jar), à appeler sur le **thread principal** : `exists(id)`, `tagIds()`, `display(id)`, `rarity(id)`, `rarityDisplay(id)`, `rarityOrder(id)`, `outOfSeason(id)`, `owns(uuid, id)` (faux si hors ligne), `give(uuid, id, durationMillis)`.

---

## 8. Limites et points d'attention (spécifiques à Tag)
- README : jar cité `2.0.0` alors que le `pom.xml` est en **2.2.0**.
- `/tag info` exige un joueur **en ligne** ; les autres commandes admin acceptent les joueurs hors ligne déjà connus.
- Les tags temporaires « Premium » ne sont bloqués que sur la **commande** ; l'**API** (Crate, Pass) peut en donner même en Free.
- Pack de ressources en **HTTP** (port dédié à ouvrir) ; shaders calibrés **1.21.11** uniquement.
- L'éditeur en jeu (`create/edit/delete`) réécrit `tags.yml` (les commentaires sont conservés par l'API YAML de Paper, mais à valider sur votre version) ; `/tag create` ne crée qu'un tag en `display` simple — les effets/`price`/`event` se règlent dans le fichier.
- Le jar Free contient tout le code Premium (seule `edition.properties` diffère) : l'activation dépend de la licence, pas de l'absence de code.

## 9. Arguments de vente vérifiés
Tags **animés visibles dans le chat** grâce aux shaders · **Atelier** (chaque joueur crée son tag → monétisable) · **12 effets** (dont 10 animés) + **9 alphabets** + **5 mouvements** · dégradés **OKLab** · boutique, raretés, **événements saisonniers** à dates · tags **temporaires** auto-expirants · **Tebex-ready** (commandes console) · **API publique** · migration **automatique** depuis TagsCustom · aucun SQL sur le thread principal · MySQL réseau.
