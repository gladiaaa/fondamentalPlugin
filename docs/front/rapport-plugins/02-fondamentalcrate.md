# 🎰 FondamentalCrate — rapport détaillé

**Version analysée** : 1.2.0 (`pom.xml`) · **Paper** 1.21+ (API 1.21.4) · **Java** 21 · **Jars** : `FondamentalCrate-Free-1.2.0.jar` / `FondamentalCrate-Premium-1.2.0.jar` (produits par `build.sh` ou par Maven `-P free|premium`) · ID licence : `crate`
Le dépôt contient déjà un **wiki** (`docs/wiki/*.md`), un **texte de vente BBCode** (`docs/marketplace.txt`), une **accroche** (`docs/listing-hook.txt`) et une **checklist médias** (`docs/media-checklist.md`).

---

## 1. En bref

Système de crates **animé et entièrement configurable** : un bloc du monde (coffre, ender chest…) lié à une crate, des **clés** (physiques ou virtuelles), une **animation d'ouverture** (5 en GUI, 4 en 3D dans le monde dont une « chambre au trésor »), des récompenses **pondérées** avec raretés, et un **éditeur 100 % en jeu**. Mécaniques modernes (Premium) : **pitié**, **limites de gain**, **paliers d'ouverture**, mode **« au choix »**, **« quitte ou double »**.

---

## 2. Vu du joueur

| Action | Comment |
|---|---|
| Ouvrir une crate | **Clic droit** sur le bloc de crate (avec une clé physique en main, ou des clés virtuelles) |
| Voir le contenu et les taux | **Clic gauche** sur le bloc, ou `/crate preview <crate>` — probabilités **exactes** (`<chance>` calculé depuis les poids réels) |
| Ouvrir toutes ses clés d'un coup | **Shift + clic droit** (jusqu'à `max-bulk`, récapitulatif final) |
| Menu global | `/crate` → ouvre n'importe quelle crate **de n'importe où**, sans bloc |
| Voir ses clés | `/crate keys` |
| Statistiques | `/crate stats` : ouvertures et clés par crate, totaux, **5 derniers gains** |
| Historique | `/crate history` (54 derniers gains max) |
| Lister les crates | `/crate list` |

**Pendant l'ouverture** : animation (voir §4.3) puis **mise en valeur du gain** : titre plein écran (rareté + nom du lot), son (plus éclatant pour un lot rare), **feu d'artifice coloré par la rareté**, et **annonce serveur** pour les raretés/lots marqués `broadcast`.

**Modes spéciaux** (Premium) : **« au choix »** (le joueur sélectionne lui-même ses lots dans un menu, sans hasard) ; **« quitte ou double »** (après un gain simple : *encaisser* ou *tenter de doubler*, chance configurable, plafond `x8` par défaut ; fermer le menu = encaisser, jamais de perte accidentelle).

**Le bloc de crate** : hologramme, objet 3D **flottant** qui tourne (la clé par défaut), particules d'ambiance (Premium). **Protégé** contre la casse à la main (message « utilise `/crate unset` »), les explosions et les pistons. Les coffres « crate » ne s'ouvrent pas comme des coffres normaux.

---

## 3. Vu de l'administrateur

### 3.1 Installation (README/wiki)
1. Jar dans `plugins/` → démarrer une fois : `config.yml`, `crates.yml`, `messages.yml` générés.
2. **Poser un bloc**, le viser, `/crate set <crate>` — **ou tout faire via `/crate editor`**.
3. `/crate give <joueur> <crate> <nb>` pour distribuer des clés.
4. **Premium** : `license.key` dans `config.yml`, puis redémarrer (voir §8).

### 3.2 Commandes (`/crate`, alias `/crates`, `/cc`)

**Joueur** (`fondamentalcrate.use`, tous) : `/crate` (menu), `keys`, `stats`, `list`, `history`. `preview` : `fondamentalcrate.preview` (tous par défaut).

**Administration** (`fondamentalcrate.admin`, op) — **plus complet que le README** (vérifié dans `CrateCommand`) :

| Commande | Effet |
|---|---|
| `/crate give <joueur> <crate> [nb]` | Clés **virtuelles** (joueur en ligne) |
| `/crate givekey <joueur> <crate> [nb]` | Clés **physiques** (objets, piles de 64) |
| `/crate giveall <crate> [nb]` | Clés virtuelles à **tous les connectés** |
| `/crate givekeyall <crate> [nb]` | Clés physiques à tous les connectés |
| `/crate get <crate> [nb]` | Se donner des clés physiques (test) |
| `/crate take <joueur> <crate> [nb\|all]` | Retire des clés **virtuelles** |
| `/crate takeall <crate> [nb\|all]` | Retire à tous les connectés |
| `/crate set <crate>` / `/crate unset` | Lie / délie le **bloc visé** (portée 6 blocs) |
| `/crate editor` | **Éditeur complet en jeu** |
| `/crate reload` | Recharge config, crates, textes, hologrammes |
| `/crate history <joueur>` | Historique d'un autre joueur |

Plafond de quantité par commande : **2304**. Tab-completion complète.

### 3.3 Permissions
| Permission | Défaut | Donne |
|---|---|---|
| `fondamentalcrate.use` | tous | Ouvrir, menu, clés, stats, liste, historique |
| `fondamentalcrate.preview` | tous | Aperçu et taux |
| `fondamentalcrate.admin` | op | give/givekey/…/set/unset/editor/reload |
| *(par crate)* `permission:` dans `crates.yml` | — | Exiger une permission pour **ouvrir** cette crate |
| *(par lot)* `permission:` / `permission-negated:` | — | Réserver un lot à ceux qui l'ont / ne l'ont **pas** |

### 3.4 Placeholders (`fondamentalcrate`)
`%fondamentalcrate_keys_<crate>%` (physiques **+** virtuelles) · `keys_total` · `name_<crate>` · `pity_<crate>` (`compteur/seuil` ou `0`) · `opens_<crate>` · `opens_total` · `used_<crate>` (clés utilisées sur le serveur, tous joueurs) · `used_total`.

### 3.5 Éditeur en jeu (`/crate editor`)
Menu principal → liste des crates + **« Créer une crate »**. Par crate : **nom affiché**, **animation** (les Premium sont signalées), **bloc**, **récompenses**, **réglages**, **hologramme**, **donner des clés à tous**, **supprimer** (shift + clic pour confirmer). Détail :
- **Récompenses** : « ajouter l'objet en main », « ajouter un tag » (FondamentalTag), puis pour chaque lot : quantité (±1/±8), **poids** (±1/±10), **rareté**, supprimer.
- **Réglages** : cooldown (±1 s/±10 s), lots par ouverture, mode « au choix », **thèmes** de la chambre au trésor, max d'ouverture multiple (±8), **permission** (saisie au chat).
- **Hologramme** : on/off, hauteur (±0,1), objet flottant, lignes (ajout/édition au chat, MiniMessage).
Chaque action **réécrit `crates.yml`** puis recharge les crates et hologrammes ; le fichier reste la source de vérité. Les saisies se font dans le chat (`annuler` pour abandonner).

---

## 4. Personnalisation — les fichiers

Créés dans `plugins/FondamentalCrate/` : `config.yml`, `crates.yml`, `messages.yml`, `blocks.yml` (liaisons bloc↔crate, **géré par le plugin**), `logs/wins-AAAA-MM-JJ.log` (journal des gains), + données joueurs (§5).

### 4.1 `config.yml`
| Section | Clés | Rôle |
|---|---|---|
| `settings` | `one-open-at-a-time` (true), `cooldown-seconds` (0), `full-inventory` (`drop`\|`deny`), `broadcast-enabled`, `preview-show-chance`, `autosave-seconds` (300), `reward-log` (true), `floating-key` (true) | Comportement général |
| `settings.win-flourish` | `title`, `sound`, `firework`, `firework-rare-only` | Mise en valeur du gain (chaque effet indépendant) |
| `colors` | 9 balises | Charte de couleurs (chat, menus, animations, console) |
| `license` | `key`, `check-interval-hours` (6), `grace-hours` (72) | Licence (jar Premium) |
| `storage` | `type` (`json`\|`mysql`), `mysql.{host,port,database,username,password,useSSL,table-prefix}` | Stockage (MySQL = Premium ; préfixe `cc_` permet plusieurs installs sur une base) |
| `tagcustom` | `enabled`, `plugin-name`, `rarity-from-tag`, `rarity-map`, `grant-mode` (`luckperms`\|`command`), `grant-command`, `luckperms-context-server` | Intégration Tag (section nommée « tagcustom » pour raisons historiques) |
| `animations` | `default` + un bloc par animation (titre, durées, sons, particules) | Réglage fin des 9 animations |

### 4.2 `crates.yml`
Deux sections : `rarities` puis `crates`.

**Raretés** (partagées) : `display` (MiniMessage), `color` (verre coloré des animations GUI), `firework` (couleur hex des feux), `broadcast` (annonce serveur). 4 par défaut : `common`, `rare`, `epic`, `legendary`. Une rareté absente d'un lot = `common`.

**Options d'une crate** (`crates.<id>.…`) :

| Option | Défaut | Rôle | Édition |
|---|---|---|---|
| `display` | id | Nom (MiniMessage) | Free+Premium |
| `animation` | `animations.default` | `roulette`, `cascade`, `wheel`, `spotlight`, `flip`, `spiral`, `firework`, `tornado`, `quad` | voir §6 |
| `block` | `CHEST` | Bloc posé dans le monde | Free+Premium |
| `cooldown` | -1 (global) | Délai mini entre ouvertures (s) | Free+Premium |
| `permission` | — | Permission pour ouvrir | Free+Premium |
| `cost` | 0 | Coût d'ouverture (**Vault**) | Free+Premium |
| `max-bulk` | 54 | Clés ouvrables d'un coup (1–54) | Free+Premium |
| `rewards-per-open` | 1 | Lots par ouverture (max 9 ; = nb de coffres en `quad`) | Free+Premium |
| `hologram.{enabled,offset,lines}` | — | Hologramme (lignes MiniMessage ; `<winners>` = **vitrine des derniers gagnants** en bandeau cyclique) | Free+Premium |
| `key.{material,name,lore,glow,custom-model-data}` | `TRIPWIRE_HOOK` | Apparence de la clé | Free+Premium |
| `preview.{title,rows}` | 3 lignes | Menu d'aperçu (1–6) | Free+Premium |
| `keys-required` | 1 | Clés consommées par ouverture (1–64) | **Premium** |
| `selection` (alias `open-type: selection`) | false | Mode « au choix » | **Premium** |
| `pity.{threshold,rarity}` | — | Pitié | **Premium** |
| `milestones.<N>.{repeat,display,actions}` | — | Paliers d'ouverture | **Premium** |
| `floating-item` | la clé | Objet 3D flottant propre à la crate | **Premium** |
| `ambient-particle` / `ambient-effect` | — / `puff` | Particules d'ambiance ; formes `puff`, `halo`, `helix`, `vortex`, `fountain`, `spiral` | **Premium** |
| `quad-themes` | tous | Thèmes autorisés de la chambre au trésor (`classic`, `nether`, `ocean`, `soul`, `end`, `forest`) | (animation `quad` = Premium) |
| `double-or-nothing` / `-chance` (0,05–0,95) / `-max` (2–4096) | false / 0,5 / 8 | « Quitte ou double » — **absent du README** | **Premium** |

**Récompenses** (`crates.<id>.rewards.<id>`) :

| Champ | Rôle |
|---|---|
| `weight` | Poids (> 0, obligatoire) ; probabilité = poids / somme des poids |
| `rarity` | Rareté (couleur, son, annonce) ; **absent = rareté reprise du tag** pour un lot de tag |
| `broadcast` | Force/annule l'annonce serveur |
| `permission` / `permission-negated` | Lot tirable seulement avec / sans la permission |
| `limit.global` / `limit.per-player` | Quota de gains (0 = illimité) — **Premium** ; un lot épuisé sort du tirage |
| `display` | Icône dans l'aperçu/animation : `material` ou `custom-item`, `amount`, `name`, `lore` ; variables `<chance>`, `<rarity>`, `<tag>` |
| `actions` | Liste d'actions cumulables (ci-dessous) |

**Types d'actions** (5 dans le code ; le README n'en liste que 4) :

| `type` | Champs | Effet |
|---|---|---|
| `item` | `material`/`custom-item`, `amount`, `name`, `lore`, `enchants`, `glow`, `custom-model-data` | Donne un objet |
| `command` | `command`, `as: console\|player` | Exécute une commande (`%player%`) |
| `message` | `message` | Message au joueur |
| `tag` | `tag`, `duration` (`12h`, `7d`, `1d12h`…) | Donne un tag **FondamentalTag** (permanent ou temporaire ; re-gagner prolonge). Sans FondamentalTag : ancien TagsCustom → pose la permission via LuckPerms ou commande |
| `cosmetic` ⚠️ *non documenté* | `permission`, `coins`, `display` | Cosmétique **FondamentalBedwars** : pose la permission ; **doublon → `coins`** ajoutés à la meta LuckPerms `fbw-coins` |

**Objets custom** : `custom-item: "itemsadder:ruby"` (ou `oraxen:<id>`, `nexo:<id>`) dans un `display` ou une action `item` ; repli sur `material` si le plugin est absent.

Exemple minimal :
```yaml
crates:
  vote:
    display: "<gradient:#00FFFF:#1E90FF><bold>Crate Vote</bold></gradient>"
    animation: cascade
    block: CHEST
    rewards:
      diamants:
        weight: 35
        rarity: common
        display: { material: DIAMOND, amount: 8, name: "<aqua>8 Diamants" }
        actions: [ { type: item, material: DIAMOND, amount: 8 } ]
      tag_frost:
        weight: 3
        rarity: legendary
        limit: { per-player: 1 }
        display: { material: NAME_TAG, name: "<white>Tag <tag>" }
        actions: [ { type: tag, tag: frost, duration: 30d } ]
```
Le fichier livré contient 5 crates de démo : `vote` (cascade), `legendaire` (spiral), `mythic` (firework + pitié 10), `storm` (tornado), `choix` (mode « au choix »).

### 4.3 Les 9 animations

| Animation | Type | Description | Édition |
|---|---|---|---|
| `roulette` | GUI | Bande horizontale façon CS:GO qui ralentit sur le gain | **Free** |
| `cascade` | GUI | Machine à sous à 5 rouleaux qui s'arrêtent un par un | **Free** |
| `wheel` | GUI | Roue de la fortune : un curseur parcourt la bordure | Premium |
| `spotlight` | GUI | Un projecteur saute de lot en lot avant de se figer | Premium |
| `flip` | GUI | Des cartes se retournent une à une | Premium |
| `spiral` | 3D | Les lots tournent en spirale, l'orbite se resserre, le gagnant monte | Premium |
| `firework` | 3D | Le lot jaillit du bloc, feux d'artifice colorés par la rareté | Premium |
| `tornado` | 3D | Hélice de lots en entonnoir jusqu'au gagnant | Premium |
| `quad` | 3D | **Chambre au trésor** : une zone thématique (6 thèmes) apparaît autour du joueur avec **un coffre par lot** ; il clique chaque coffre, puis tout disparaît. **Aucun bloc du monde modifié** (entités d'affichage). | Premium |

Réglage par animation dans `config.yml > animations.<nom>` (ticks, vitesses, sons, particules, rayon, thème `random`/imposé…). Un nom de son/particule inconnu retombe sur une valeur par défaut avec avertissement.

### 4.4 `messages.yml`
Tous les textes en MiniMessage, préfixe `[FCrate]`, variables `<crate>`, `<reward>`, `<rewards>`, `<amount>`, `<player>`, `<keys>`, `<cost>`, `<seconds>`, `<opens>`, `<tag>`, `<input>`. **Mise à jour sûre** : à chaque démarrage, les clés manquantes sont ajoutées depuis le jar sans écraser vos textes.

---

## 5. Données : « le JSON »

Stockage choisi par `storage.type`. Les données sont **chargées à la connexion du joueur et écrites à la déconnexion** (+ sauvegarde auto toutes les `autosave-seconds`) ; tout tient en mémoire, les fichiers sont réécrits **en bloc** au flush, jamais à chaque modification.

### Mode `json` (défaut, toutes éditions) — dans `plugins/FondamentalCrate/`

| Fichier | Format (Gson, indenté) | Exemple |
|---|---|---|
| `keys.json` | `{ uuid: { crateId: nbClés } }` | `{"069a79f4-…": {"vote": 3, "legendaire": 1}}` |
| `history.json` | `{ uuid: [ {crateDisplay, rewardName, material, time} ] }` — **54 entrées max/joueur** | `[{"crateDisplay":"<gold>Vote","rewardName":"<aqua>8 Diamants","material":"DIAMOND","time":1790000000000}]` |
| `pity.json` | `{ uuid: { crateId: compteur } }` | `{"…": {"mythic": 7}}` |
| `limits.json` | `{ uuid: { "crate/lot": nbGains, "@opens:crate": ouverturesCumulées } }` | `{"…": {"vote/tag_frost": 1, "@opens:vote": 42}}` |
| `global-limits.json` | `{ "crate/lot": nbTotal, "@opens:crate": clésUtilisées }` | `{"vote/tag_frost": 12, "@opens:vote": 5310}` |

Migration **transparente** des anciens `keys.yml` / `history.yml` vers JSON au premier démarrage. Ces JSON sont des **données runtime** (ne pas les versionner ni les éditer serveur allumé). Le fichier `blocks.yml` (liaison blocs) et `logs/wins-*.log` sont les autres fichiers générés.

### Mode `mysql` (Premium) — 5 tables (préfixe `cc_`)
`cc_keys(uuid, crate, amount)` · `cc_history(id, uuid, crate, reward, material, win_time)` · `cc_pity(uuid, crate, counter)` · `cc_limits(uuid, reward_key, counter)` · `cc_global_limits(reward_key, counter)`.
**Un site web peut lire directement** `cc_global_limits` (clé `@opens:<crate>`) pour afficher « X clés utilisées » sans API (déjà cité dans le wiki). Si MySQL est indisponible, le plugin **retombe sur JSON** au lieu de refuser de démarrer.

---

## 6. Free vs Premium

| | **Free** | **Premium** |
|---|---|---|
| **Nombre de crates** | **2 maximum** (les 2 premières valides de `crates.yml`) | **Illimité** |
| **Animations** | `roulette`, `cascade` | + `wheel`, `spotlight`, `flip`, `spiral`, `firework`, `tornado`, `quad` |
| Pitié, limites de gain, paliers, mode « au choix », « quitte ou double », clés multiples, particules d'ambiance, objet flottant par crate | ❌ (ignorés + avertissement console) | ✅ |
| **Stockage** | JSON | JSON **ou MySQL** (réseau) |
| Éditeur en jeu, menu global `/crate`, aperçu & taux, hologrammes (+ vitrine `<winners>`), objets custom, placeholders, FondamentalTag, Vault (coût), clés physiques/virtuelles, ouverture multiple, lots multiples par ouverture, cooldown, permissions, annonces, stats, historique, journal des gains | ✅ | ✅ |

**Comportements de dégradation (vérifiés)** :
- Une crate qui demande une animation Premium **retombe sur l'animation par défaut** (`animations.default`, elle-même forcée à une animation autorisée ; sinon `roulette`), avec avertissement.
- Au-delà de 2 crates : les suivantes sont **ignorées** avec un message « passe en Premium ».
- `storage.type: mysql` en Free → JSON.
- Le jar **Premium sans clé valide = Free**. Le jar **Free** ne contient **ni** `Spiral`/`Firework`/`Tornado` **ni** `MySqlBackend` (⚠️ contient encore `Quad`, `Wheel`, `Spotlight`, `Flip`, bloqués à l'exécution).
- Passage Free → Premium après démarrage : les crates sont **rechargées automatiquement** (mécaniques Premium appliquées).

---

## 7. Garanties (vérifiées dans le code)
- **Le tirage précède l'animation** : le résultat est décidé avant ; l'animation n'est que de la mise en scène.
- **Aucune clé perdue** : déconnexion pendant l'animation ou arrêt serveur → **la clé est rendue** (le lot, lui, n'est pas remis dans ce cas : c'est la clé qui revient). **Fermer le menu d'une animation GUI en plein tour** → l'ouverture se termine aussitôt et le **gain est remis**. Plantage d'une animation → le joueur reçoit quand même son gain (`OpenSession.abort/complete`, `GuiListener`, `OpenManager.abortAll`).
- **Probabilités honnêtes** : aperçu = poids réels.
- **Clés infalsifiables** : l'identité de la crate est dans le `PersistentDataContainer` de l'objet (renommer en enclume ne suffit pas).
- **Rien ne traîne** : entités d'animation suivies par session, orphelins nettoyés au démarrage (les nôtres uniquement).
- **Blocs protégés** contre casse, explosions, pistons.
- **Limites de gain cohérentes en ouverture multiple** (compteur provisoire partagé).

---

## 8. Wiki d'utilisation (recettes)

### A. Première crate en 2 minutes
1. `/crate editor` → **Créer une crate** → saisir l'id dans le chat.
2. Choisir l'**animation**, le **bloc**, puis **Récompenses** : tenir un objet en main → « Ajouter l'objet en main » ; régler poids et rareté.
3. Poser un bloc, le viser : `/crate set <id>`.
4. `/crate give <toi> <id> 5` puis clic droit sur le bloc.

### B. Ajouter un tag en récompense (avec FondamentalTag)
`- { type: tag, tag: frost, duration: 7d }` ; sans `rarity` sur le lot, la rareté du tag est reprise (table `tagcustom.rarity-map` : `commun→common`, `rare→rare`, `epique→epic`, `legendaire→legendary`, `mythique→legendary`, `evenement→legendary`). Le nom du lot peut afficher le rendu réel du tag avec `<tag>`.

### C. Pitié (Premium)
```yaml
pity: { threshold: 50, rarity: legendary }
```
Au 50e tirage sans lot `legendary`, un lot `legendary` **éligible** est forcé. Le compteur se remet à zéro dès qu'un lot de cette rareté sort. Affichable : `%fondamentalcrate_pity_<crate>%`.

### D. Limiter un lot (Premium)
`limit: { global: 100, per-player: 1 }` — le lot sort du tirage une fois épuisé ; message « tous les lots ont été épuisés » si plus rien n'est tirable.

### E. Palier de fidélité (Premium)
```yaml
milestones:
  '25': { repeat: true, display: { material: DIAMOND_BLOCK, name: "<aqua>Fidélité" }, actions: [ { type: item, material: DIAMOND_BLOCK, amount: 4 } ] }
```
Lot **bonus garanti** à la 25e ouverture cumulée (puis 50e, 75e… avec `repeat: true`).

### F. Crate « au choix » (Premium)
`selection: true` + `rewards-per-open: 2` → le joueur choisit 2 lots dans un menu. Poids/raretés servent à l'affichage.

### G. Vendre des clés (Tebex)
`crate give {username} vote 5` (virtuelles) ou `crate givekey {username} vote 5` (physiques). **Le joueur doit être en ligne.** Pour offrir à tous : `crate giveall vote 1`.

### H. Réseau (Premium)
`storage.type: mysql` + identifiants, **même base** sur chaque serveur, redémarrer (voir limites). Les clés, historique, pitié et compteurs par joueur suivent le joueur.

### I. Lire les statistiques depuis un site web
Table `cc_global_limits`, `reward_key = '@opens:<crate>'` → nombre total de clés utilisées. Placeholders équivalents en jeu : `used_<crate>`, `used_total`.

---

## 9. Limites et points d'attention (spécifiques à Crate)
1. **Premier démarrage Premium + MySQL** : le backend est choisi avant la fin de la vérification en ligne → **JSON tant qu'on ne redémarre pas** (dès le 2e démarrage le cache de licence est valide).
2. **Compteurs globaux en multi-serveurs** (limites `global` et `used_*`) : chargés au démarrage puis **réécrits en bloc** (`DELETE`/`INSERT`) → les serveurs s'écrasent mutuellement. Les données **par joueur** sont fiables (chargées/écrites à la connexion/déconnexion).
3. Message `tag-already-owned` dit « converti en compensation » alors qu'**aucune compensation** n'est donnée.
4. Le README/`config.yml` classent `wheel/spotlight/flip` en Free : **faux** (Premium dans le code).
5. Le README dit « pas de serveur de licence » : **faux** (vérification en ligne réelle).
6. Le jar Free contient encore `QuadCrateAnimation` (bloquée à l'exécution).
7. Le wiki (`docs/wiki`) parle encore de **TagCustom Premium** et ne mentionne ni `cosmetic`, ni `double-or-nothing`, ni `<winners>`, ni `giveall/givekeyall/get/take/takeall`.
8. Crates de démo : les tags `galaxy`, `king`, `queen`, `rainbow` **n'existent pas** dans le `tags.yml` par défaut de FondamentalTag.
9. `full-inventory: drop` : objet jeté au sol ; `deny` refuse l'ouverture si l'inventaire est plein (uniquement pour les lots qui donnent un objet).
10. bStats est actif (service `33750`, graphiques : édition, backend de stockage, usage de Tag, nombre de crates).

## 10. Arguments de vente vérifiés
**9 animations** dont une **chambre au trésor 3D** sans modifier le monde · **éditeur 100 % en jeu** · pitié / limites / paliers / « au choix » / **quitte ou double** · clés physiques **et** virtuelles, **ouverture multiple** en 1 clic · **probabilités affichées = réelles** · **aucune clé perdue** · journal des gains daté · **JSON ou MySQL réseau** · objets **ItemsAdder/Oraxen/Nexo** · **FondamentalTag** natif (raretés, tags temporaires) · vitrine des derniers gagnants en hologramme.
