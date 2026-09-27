# Gamme Fondamental — synthèse (à lire en premier)

Rapport d'analyse en **lecture seule** des 4 dépôts `gladiaaa/fondamentalBedwars`, `FondamentalTag`, `FondamentalCrate`, `FondamentalPass` (état du 26/09/2026, branche `main`).

> **Méthode.** Tout ce qui est écrit ici a été vérifié dans le code source (pas seulement dans les README). Quand le code contredit la doc, c'est **le code qui fait foi** et l'écart est signalé (section 8). Aucun fichier des dépôts n'a été modifié : les dépôts ont été clonés dans un dossier temporaire dont l'URL de push a été neutralisée, puis supprimés.
>
> **Non analysé** (absent des 4 dépôts) : le serveur de licences, les tarifs, la configuration Tebex/boutique, le contenu du pack de ressources Bedwars, les jars compilés.

Fichiers de ce rapport : [`01-fondamentaltag.md`](01-fondamentaltag.md) · [`02-fondamentalcrate.md`](02-fondamentalcrate.md) · [`03-fondamentalpass.md`](03-fondamentalpass.md) · [`04-fondamentalbedwars.md`](04-fondamentalbedwars.md)

---

## 1. La gamme en un coup d'œil

| | **FondamentalTag** | **FondamentalCrate** | **FondamentalPass** | **FondamentalBedwars** |
|---|---|---|---|---|
| **En une phrase** | Tags de joueur (chat, tête, TAB) animés, boutique, atelier de tag perso | Crates animées (GUI + 3D), éditeur en jeu, pitié/limites/paliers | Pass de saison + quêtes, partagés sur tout le réseau | Bedwars complet : matchmaking, classé Elo, cosmétiques, boutique |
| **Version (pom.xml)** | 2.2.0 | 1.2.0 | 1.0.0 | 1.0-SNAPSHOT |
| **Serveur** | Paper 1.21.x (API 1.21.4) | Paper 1.21+ (API 1.21.4) | Paper 1.21.4+ | Paper 1.21.4 |
| **Java** | 21 | 21 | 21 | 21 |
| **Jars livrés** | **2 jars** : `-free` / `-premium` | **2 jars** : `Free` / `Premium` | **1 jar** (édition = licence) | **1 jar** (édition = licence) |
| **Dépendance obligatoire** | aucune | aucune | aucune | **FastAsyncWorldEdit** (`depend`) |
| **Dépendances facultatives** | PlaceholderAPI, Vault, PlayerPoints | LuckPerms, PlaceholderAPI, Vault, ItemsAdder/Oraxen/Nexo, FondamentalTag | PlaceholderAPI, Vault, LuckPerms, FondamentalTag, FondamentalCrate | ProtocolLib, LuckPerms (**quasi indispensable**, voir §4), PlaceholderAPI |
| **Stockage** | SQLite (`tags.db`) ou MySQL (Premium) | **JSON** (5 fichiers) ou MySQL (Premium) | SQLite (`data.db`) ou MySQL (Premium) ; profil **sérialisé en JSON** | MySQL (stats, Premium) ; arènes en YAML ; cosmétiques/coins/Elo dans **LuckPerms** |
| **Config** | `config.yml`, `tags.yml`, `customization.yml`, `messages.yml` | `config.yml`, `crates.yml`, `messages.yml`, `blocks.yml` (auto) | `config.yml`, `season.yml`, `quests.yml`, `messages.yml` | `config.yml`, `cosmetics.yml`, `death-effects.yml`, `shop.yml`, `messages.yml`, `arenas/*.yml` |
| **ID licence (`product`)** | `tagcustom` *(ancien nom)* | `crate` | `pass` | `bedwars` |
| **PlaceholderAPI** | `%fondamentaltag_…%` | `%fondamentalcrate_…%` | `%fpass_…%` | `%fondamentalbedwars_…%` |
| **Commande principale** | `/tag` (`/tags`, `/ftag`) | `/crate` (`/crates`, `/cc`) | `/pass` (`/battlepass`, `/bp`), `/quetes` | `/bedwars` (`/bw`), `/cosmetics`, `/party`, `/fbw` |

### À propos du « JSON »
Les plugins **ne se configurent pas en JSON** : toute la configuration est en **YAML** (+ texte **MiniMessage**). Le JSON n'apparaît que pour :
- **FondamentalCrate** : stockage des données joueurs par défaut (`keys.json`, `history.json`, `pity.json`, `limits.json`, `global-limits.json`) → détail dans le fichier Crate ;
- **FondamentalPass** : le profil d'un joueur est sérialisé en JSON (Gson) dans une colonne de la base → détail dans le fichier Pass ;
- **les 4 plugins** : l'échange avec le serveur de licences se fait en JSON (`POST /api/v1/verify`).

Si vous pensiez à un « fichier JSON de personnalisation », il n'existe pas : c'est `crates.yml`, `tags.yml`, `season.yml`, `quests.yml`, `cosmetics.yml`, `shop.yml`, etc.

---

## 2. Le modèle Free / Premium (commun aux 4 plugins)

### Fonctionnement de la licence (vérifié dans `EditionGate` de chaque plugin)
1. L'acheteur colle sa clé dans `config.yml` → `license.key`.
2. Au démarrage puis **toutes les 6 h** (`license.check-interval-hours`), le plugin envoie `{key, product, installationId, nonce}` en `POST` JSON à `/api/v1/verify` du serveur de licences.
3. Le serveur répond `{valid, edition, issuedAt, expiresAt, signature}`. La réponse est **signée Ed25519** ; le jar ne contient que la clé publique et un **nonce** anti-rejeu.
4. La réponse est mise en cache (`license-cache.properties`, signé) : **tolérance hors-ligne de 72 h** (`license.grace-hours`), puis retour en Free.
5. Une clé **refusée/révoquée** repasse **immédiatement** en Free (pas de tolérance) ; une **panne réseau** garde l'état courant.
6. **Sans clé : édition Free, aucun appel réseau.**
7. Un **identifiant d'installation** (`license-installation.id`, UUID) est généré par serveur ; la limite d'installations par clé est appliquée côté serveur de licences (non analysable ici). Commande de contrôle : `/tag license [check]`, `/fbw license [check]`, `/pass admin license [check]` ; pour Crate, le statut apparaît dans les logs de démarrage (pas de commande dédiée).
8. Le paquet `…edition` est **obfusqué (ProGuard)** dans les jars distribués (`*-obf.jar` pour Tag/Bedwars/Pass ; Crate via `build.sh`).

### Deux façons de livrer Free/Premium

| Plugin | Modèle | Détail |
|---|---|---|
| **Tag**, **Crate** | **Deux jars** (profil Maven `free` / `premium`) | Un jar Premium **sans clé valide = Free**. Le jar Free de Crate ne contient ni les animations `spiral`/`firework`/`tornado` ni le backend MySQL ; le jar Free de Tag contient tout le code (seul `edition.properties` change). |
| **Bedwars**, **Pass** | **Un seul jar** | L'édition dépend **uniquement** de la clé de licence. |

### Vue d'ensemble des différences (résumé ; détail dans chaque fichier)

| Fonction | Tag | Crate | Pass | Bedwars |
|---|---|---|---|---|
| **Limite de volume** | — | **2 crates** max (Free) | **30 paliers** max (Free) | **2 arènes** max (Free) + **1 instance/arène** |
| **Stockage réseau (MySQL)** | Premium | Premium | Premium | Premium (stats) |
| **Contenu « spectaculaire »** | Dégradés, arc-en-ciel, effets animés, styles Unicode, pack de ressources | 7 animations sur 9 (dont 3D + chambre au trésor) | Piste premium du pass | Cosmétiques payants/rares+, classé Elo, Duos/Squads… |
| **Automatisation / intégrations** | Tags temporaires, boutique (`price`), éditeur en jeu | Pitié, limites de gain, paliers, mode « au choix », « quitte ou double », clés multiples, décor | Objectifs `custom`/`placeholder`, récompenses `tag`/`crate-key` | BungeeCord (renvoi lobby), multi-instances |
| **Reste identique** | Menus, chat, nametag, TAB, permissions, placeholders, raretés, événements, `/tag give` permanent | Éditeur en jeu, menu global, aperçu/taux, hologrammes, clés physiques/virtuelles, Vault, PAPI, FondamentalTag | 13 objectifs vanilla, quêtes quotidiennes/hebdo/saison, récompenses argent/objet/commande/message | Toute la boucle de jeu, boutique, pièges, upgrades, party, parties privées, scoreboard |

---

## 3. Personnalisation commune

- **Textes** : tous en **MiniMessage** dans `messages.yml` (Tag, Crate, Pass, Bedwars). Valeur `""` = message désactivé (Tag, Pass, Bedwars). Les clés manquantes sont **ajoutées automatiquement** depuis le jar sans écraser vos textes (Crate, Bedwars).
- **Charte de couleurs** (`config.yml` → `colors`) : 9 balises réutilisables partout (`<texte>`, `<fort>`, `<accent>`, `<discret>`, `<ok>`, `<erreur>`, `<alerte>`, `<info>`, `<degrade>…</degrade>`). Changer une valeur recolore chat, menus **et console**. Défaut : palette violette Fondamental (`#9A90B3`, `#F0ECF8`, `#B7A0FF`, `#6A5D94`, `#7ED6A0`, `#F07A7A`, `#F0C36A`, `#8FB8FF`, dégradé `#B7A0FF → #6A5D94`).
- **Préfixes** : `[FTag]`, `[FCrate]`, `[FPass]`, `[FBedwars]`.
- **Rechargement à chaud** : `/tag reload`, `/crate reload`, `/pass admin reload`, `/fbw reload` (+ `/bw reload` pour arènes/config).
- **Compatibilité pack shader Tag** : Crate et Pass décalent d'un cran les couleurs que le shader de FondamentalTag animerait, pour qu'elles restent fixes (`Text.shaderReserved` / `Text.detectShader`).

> Petite différence de syntaxe à connaître : `messages.yml` de **Tag/Bedwars** utilise `{variable}` ; celui de **Crate/Pass** utilise `<variable>`. Dans le `config.yml` de Bedwars, les thèmes de messages de jeu utilisent des codes **`&`** (legacy).

---

## 4. Écosystème : qui parle à qui (vérifié dans le code)

| De → Vers | Mécanisme | État |
|---|---|---|
| **Crate → Tag** | Récompense `type: tag` → `FondamentalTagApi.give()` (réflexion, sans dépendance de jar). Durée optionnelle (`duration: 7d`), **rareté reprise** du tag, rendu réel via `<tag>` | ✅ implémenté |
| **Crate → Bedwars** | Récompense `type: cosmetic` (permission `fbw.cosmetic.<cat>.<id>` posée via LuckPerms ; **doublon → coins** dans la meta LuckPerms `fbw-coins`) | ✅ implémenté mais **non documenté** dans le README/wiki de Crate |
| **Pass → Tag** | Récompense `type: tag` (Premium) → `FondamentalTagApi.give()` | ✅ |
| **Pass → Crate** | Récompense `type: crate-key` (Premium) → **commande console** `crate give {player} {crate} {amount}` (modifiable : `hooks.crate-key-command`) | ✅ (le joueur doit être **en ligne**) |
| **Bedwars → Pass** | Le Pass expose `FondamentalPassApi.progress(player, "bedwars:win", 1)` | ❌ **Aucun appel dans Bedwars** (ni dans aucune branche/historique) |
| **Crate → Pass** | Clé `crate:open` attendue par une quête d'exemple | ❌ **Aucun appel dans Crate** |
| **Tag ↔ Bedwars** | Cohabitation : Tag ne déplace jamais un joueur d'une équipe scoreboard d'un autre plugin ; sur un serveur Bedwars, mettre `nametag.enabled: false` + placeholders | ✅ (configuration manuelle) |
| **Bedwars → LuckPerms** | Coins, Elo, rang, cosmétiques possédés/sélectionnés, suffixe de rang : **tout est stocké dans LuckPerms** (meta/permissions) | ⚠️ sans LuckPerms, coins/cosmétiques/rang **ne fonctionnent pas** |

**Conséquence marketing** : on peut annoncer « Crate ↔ Tag », « Pass ↔ Tag/Crate » et « Crate ↔ Bedwars (cosmétiques) ». On **ne peut pas** annoncer aujourd'hui « quêtes Pass alimentées automatiquement par Bedwars/Crate » (voir §8).

---

## 5. Livraison en boutique (Tebex / CraftingStore) : commandes prêtes à l'emploi

Toutes les commandes admin acceptent la **console**. Attention : plusieurs exigent que le joueur soit **connecté** au moment de la livraison (option « online only » côté boutique).

| Produit vendu | Commande console | Joueur en ligne requis ? |
|---|---|---|
| Un tag permanent | `tag give {username} <id>` | Non (joueur déjà venu au moins une fois) |
| Un tag 30 jours *(Tag Premium)* | `tag give {username} <id> 30d` (`30m`, `12h`, `7d`, `1w`, `1d12h`) | Non |
| Des points Atelier | `tag points give {username} 500` | Non |
| Une pièce d'Atelier | `tag unlock {username} <famille> <pièce>` | Non |
| Des clés de crate (virtuelles) | `crate give {username} <crate> 5` | **Oui** |
| Des clés physiques | `crate givekey {username} <crate> 5` | **Oui** |
| Le **pass premium** de la saison | `lp user {username} permission set fondamentalpass.premium true` | Non |
| De l'XP de pass | `pass admin xp give {username} 1000` | **Oui** |
| Un cosmétique Bedwars | `fbw givecosmetic {username} <catégorie:id>` | Non (joueur déjà venu) |
| Des coins Bedwars | `fbw coins add {username} 500` | **Oui** |

---

## 6. Prérequis serveur par plugin

| | Tag | Crate | Pass | Bedwars |
|---|---|---|---|---|
| Paper | 1.21.x | 1.21+ | 1.21.4+ | 1.21.4 |
| Java | 21+ | 21+ | 21+ | 21+ |
| Obligatoire | — | — | — | FastAsyncWorldEdit (2.11.2 visé) |
| Recommandé | PlaceholderAPI | Vault (coût), LuckPerms (tags legacy) | Vault (récompenses argent) | **LuckPerms**, PlaceholderAPI, ProtocolLib (skins de PNJ), MySQL 8 (Premium) |
| Réseau | MySQL (Premium) | MySQL (Premium) | MySQL (Premium) + `server.name` **unique** par serveur | MySQL (Premium) + BungeeCord (Premium) |
| Port ouvert | 8095 (hébergement pack, Premium, optionnel) | — | — | — |

---

## 7. Compatibilités notables
- **Chat** : Tag fournit son propre format (`chat.enabled`) **ou** se branche via `%fondamentaltag_tag_prefix%` sur EssentialsChat / LPC / ChatControl / VentureChat.
- **TAB (NEZNAMY)** : `nametag.enabled: false` côté Tag puis `%fondamentaltag_tag_prefix%` dans `tagprefix`/`tabprefix`.
- **Migration** : Tag **reprend automatiquement une installation « TagsCustom 1.x »** (tags, base, **clé de licence**, identifiant d'installation, placeholders `%tags_…%`). FondamentalTag est donc le **successeur de TagsCustom** — l'historique des clients existants est un argument commercial.
- **Objets custom** (Crate) : ItemsAdder `itemsadder:id`, Oraxen `oraxen:id`, Nexo `nexo:id`, avec repli sur `material`.
- **Économies** (Tag/Atelier) : points internes, Vault (Essentials, CMI…), PlayerPoints.

---

## 8. Points d'attention et écarts documentation ↔ code

### 🔴 À corriger avant de communiquer
1. **Pass — liaisons Bedwars/Crate non branchées.** Le README parle de « liaisons natives (Tag, Crate, Bedwars) » et `quests.yml` livre 3 quêtes `custom` (`bedwars:win`, `bedwars:bed_break`, `crate:open`). **Rien dans Bedwars ni Crate n'envoie ces événements** (recherche sur toutes les branches et l'historique git). Ces quêtes **ne progresseront jamais** seules. Seuls `/pass admin trigger` ou un plugin tiers via l'API les font avancer.
2. **Pass Free — récompenses perdues.** En Free, une récompense `tag` ou `crate-key` est **ignorée** (avertissement console), mais le palier est quand même **marqué « récupéré »**. Le `season.yml` par défaut met un `crate-key` au palier 5 (piste gratuite) et un `tag` au palier 30 (piste gratuite) : un joueur Free les « récupère » sans rien recevoir.
3. **Bedwars — README très en retard sur le code** (voir fichier Bedwars §11) : 9 modes (pas 4), 5 upgrades avec plus de niveaux, Elo/rangs, cosmétiques (82), party, parties privées, classement en hologrammes, PNJ skinnés… non mentionnés.
4. **Crate — `wheel`, `spotlight`, `flip` sont Premium** dans le code (`Tier.PREMIUM`), mais le README les range sous « GUI (édition Free) » et `config.yml` les commente « disponibles en Free ». Le tableau Free/Premium du README, lui, est correct. **Free = `roulette` + `cascade` seulement.**
5. **Crate — README contradictoire sur la licence** : « Pas de serveur de licence : l'édition est gravée dans le jar » alors que le même README (et le code) décrivent la vérification en ligne. C'est la vérification en ligne qui est réelle.
6. **Crate — le jar Free contient encore `QuadCrateAnimation`** (`build.sh` ne retire que `Spiral`, `Firework`, `Tornado` et `MySqlBackend`), contrairement au README (« le jar Free ne contient pas les animations 3D »). Elle reste bloquée à l'exécution (Tier Premium), mais le code est présent.
7. **Configs par défaut incohérentes entre plugins** : `crates.yml` (Crate) référence les tags `galaxy`, `king`, `queen`, `rainbow` ; `season.yml` (Pass) référence `pionnier`, `saison1` — **aucun n'existe** dans le `tags.yml` par défaut de Tag (seuls `frost`, `thunder`, `legende` existent). Résultat : « récompense de tag ignorée : ce tag n'existe pas ». À aligner pour une démo propre.

### 🟠 À savoir / limites techniques
8. **Crate + MySQL : premier démarrage.** Au tout premier boot avec une licence neuve (pas encore de cache), le backend est choisi **avant** la fin de la vérification en ligne → **JSON** est utilisé ; il faut **redémarrer** pour passer sur MySQL. (Tag gère ce cas ; Crate non.)
9. **Crate + MySQL : compteurs globaux.** Les limites de gain **globales** et les compteurs `used_*` sont chargés une fois au démarrage puis **réécrits en bloc** (`DELETE` + `INSERT`) : sur un réseau multi-serveurs, chaque serveur écrase les compteurs des autres. Ne pas promettre « limites globales sur tout le réseau » sans réserve.
10. **Crate — message trompeur** : `tag-already-owned` dit « converti en compensation » mais **aucune compensation n'est donnée** (l'action s'arrête simplement).
11. **Bedwars — limite Free de 2 arènes** vérifiée **seulement à `/bw create`**, pas au chargement : copier des fichiers `arenas/*.yml` la contourne.
12. **Bedwars — cosmétiques en Free** : le code verrouille **tout cosmétique payant** (`price > 0`) **et** toute rareté ≥ Épique. Avec le `cosmetics.yml` par défaut, seuls **5 cosmétiques « aucun/défaut »** sont utilisables en Free (README : « Commun / Rare »).
13. **Bedwars — permissions non déclarées** dans `plugin.yml` : `bedwars.private` (parties privées, libellé « MVP+ »), `bedwars.rank.{vip,vipp,mvp,mvpp,mvppp}` (affichage lobby), `fbw.cosmetic.<catégorie>.<id>`.
14. **Bedwars — éditeur en jeu limité à 4 équipes** (Rouge/Bleu/Vert/Jaune). Les modes 8 équipes (`SOLO`, `DOUBLES`) se configurent par **commandes** (`/bw setspawn <arène> AQUA|WHITE|PINK|GRAY`).
15. **Tag — restriction « temporaires = Premium »** appliquée à la **commande** `/tag give … <durée>`, mais **pas** à l'API : Crate/Pass peuvent donner un tag temporaire même sur un Tag Free.
16. **Serveur de licences** : URL `http://46.202.128.132:8091` **en dur** dans les 4 jars (`license.properties`), non configurable (voulu, pour éviter un faux serveur). Conséquences : adresse IP nue (pas de nom de domaine à changer sans recompiler tous les jars), et **HTTP non chiffré** — les réponses sont signées (intégrité OK) mais la **clé de licence transite en clair**. À anticiper avant le lancement (domaine + HTTPS + prévoir la migration des jars).
17. **Numéros de version désynchronisés** : README Tag cite `fondamentaltag-*-2.0.0.jar` (pom : 2.2.0) ; `build.sh` de Crate cite `1.0.0` (pom : 1.2.0) ; Bedwars est en `1.0-SNAPSHOT`. Le wiki Crate parle encore de « TagCustom Premium ».
18. **Dépôt Bedwars** : le dossier `AdvancedSlimePaper` est un lien de sous-module **orphelin** (pas de `.gitmodules`) — vide au clonage, sans impact fonctionnel.

### 🟢 Points forts vérifiés (utilisables en argumentaire)
- **« Aucune clé perdue » (Crate)** : le tirage précède l'animation ; déconnexion ou arrêt serveur pendant l'ouverture → **clé rendue** ; fermeture du menu d'animation → **gain remis**.
- **Probabilités honnêtes (Crate)** : l'aperçu calcule `<chance>` depuis les poids réels ; journal des gains daté (`logs/wins-AAAA-MM-JJ.log`).
- **Aucun SQL sur le thread principal** (Tag : thread dédié + cache ; Pass : pools asynchrones ; Crate : cache par joueur ; Bedwars : Hikari asynchrone).
- **Verrou de profil réseau (Pass)** : `locked_by` + attente + péremption → pas de perte de progression au changement de serveur.
- **Reconnexion en partie (Bedwars)** : fenêtre de grâce 120 s configurable.
- **Anti-abus Pass** : bloc posé puis cassé ne compte pas ; créatif/spectateur ne comptent pas ; marche : pas en vol/véhicule/téléportation.

---

## 9. Suggestions pour le site de vente

**Structure conseillée** : une page par plugin (accroche → GIF vitrine → fonctionnalités → tableau Free/Premium → prérequis → FAQ) + une page « Gamme » montrant l'écosystème (§4) + une page « Comparer Free / Premium ».

**Angles vérifiés par plugin**
- **Tag** : *tags animés partout, chat compris* (pack shader), **Atelier** (le joueur compose son tag, monétisable), **boutique + raretés + saisons**, migration TagsCustom sans effort, API publique.
- **Crate** : **chambre au trésor 3D** (vitrine), **éditeur 100 % en jeu**, pitié/limites/paliers/« quitte ou double », clés jamais perdues, probabilités affichées = réelles. (`docs/marketplace.txt` et `docs/listing-hook.txt` du dépôt Crate contiennent déjà un texte de vente BBCode et des conseils de lancement : 6,99 $ puis 9,99 $, promo -30 %, GIF de la chambre en première image.)
- **Pass** : pass de saison **réseau** (verrou de profil), quêtes à tirage pondéré, 13 objectifs vanilla + objectifs **placeholder** (n'importe quel plugin), piste premium **vendable en boutique** (une permission).
- **Bedwars** : matchmaking + **classé Elo** + rangs, **82 cosmétiques** en 14 catégories, boutique/upgrades/pièges, parties privées, party, reconnexion, mondes instanciés (FAWE).

**À ne pas promettre en l'état** : intégration Pass↔Bedwars/Crate automatique ; limites de gain globales fiables en multi-serveur (Crate) ; « cosmétiques Commun/Rare en Free » (Bedwars) ; « 3D absentes du jar Free » (Crate) ; animations `wheel/spotlight/flip` en Free.

**Médias à prévoir** : `docs/media-checklist.md` (dépôt Crate) liste déjà les GIF/captures à produire pour Crate ; l'équivalent reste à faire pour Tag (tag animé chat + menu + Atelier), Pass (menu 2 pistes + menu quêtes) et Bedwars (menu de jeu, cosmétiques, fin de partie).
