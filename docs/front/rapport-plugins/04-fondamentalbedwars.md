# 🛏️ FondamentalBedwars — rapport détaillé

**Version analysée** : `1.0-SNAPSHOT` (`pom.xml`) · **Paper 1.21.4** · **Java 21** · **Un seul jar** (`fondamentalbedwars-*-obf.jar`) : l'édition dépend **uniquement de la clé de licence** · ID licence : `bedwars`
**Dépendance obligatoire : FastAsyncWorldEdit** (`depend`, 2.11.2 visé). Facultatifs : ProtocolLib (skins de PNJ), **LuckPerms** (en pratique quasi indispensable, voir §5), PlaceholderAPI, MySQL 8 (Premium).

> ⚠️ **Le README de ce dépôt est très en retard sur le code.** Ce document est basé sur le code (83 commits, dernier : charte de couleurs du 26/09/2026). Les écarts sont listés au §10.

---

## 1. En bref

Un plugin **Bedwars complet, multi-instances et configurable** : **arènes** créées par l'admin (schematic + marqueurs), **mondes instanciés** (un monde vide par partie, collé via FAWE puis supprimé), **matchmaking** (files par mode, vote de map, **parties privées** par code), **party**, **classé Elo** avec 8 rangs, boutique/pièges/upgrades, **82 cosmétiques** en 14 catégories payables avec des **coins**, scoreboards, hologrammes de classement, reconnexion en partie.

---

## 2. Vu du joueur

### 2.1 Trouver une partie
- **Boussole** donnée au lobby, ou `/bw play` → menu **Mode : Normal / Classé** (bascule) avec les modes : `1v1`, `1v1v1v1`, `2v2v2v2` (Duos), `4v4v4v4` (Squads), et — **affichés seulement si une arène prête existe pour ce mode** — `Solo 8 équipes` et `Doubles 8×2`.
- **Files d'attente** par mode (normale et classée) ; le nombre de joueurs et le compte à rebours s'affichent. **Vote de map** entre les cartes candidates. Compte à rebours `matchmaking.countdown` (30 s) une fois `matchmaking.min-players` (2) atteint.
- **Party** : `/party invite <joueur>` (invitation valable **60 s**), `accept`, `leave`, `kick`, `disband`, `list`, `chat <msg>` (alias `/p`). **Seul le chef lance la file** ; ses membres suivent.
- **Partie privée** (permission `bedwars.private`, libellée « MVP+ » dans le menu) : le créateur choisit mode/map et reçoit un **code `FBW-XXXX`** ; les amis font `/bw join FBW-XXXX` ; le créateur lance avec `/bw start-private <code>`.
- `/bw leave` quitte la file (objet « barrière » en lobby).

### 2.2 En partie (boucle de jeu)
1. **Lobby de partie** : sélecteur d'équipe (sauf en **classé**, où les équipes sont **équilibrées par Elo**) ; les non-choisis sont rééquilibrés au lancement.
2. **Île** de chaque équipe : lit à protéger, **générateurs** Fer/Or (par équipe) et Diamant/Émeraude (au centre, avec hologrammes de compte à rebours), **PNJ marchands** auto-placés (Armes, Blocs, Potions, Pièges, Upgrades).
3. **Boutique** (menus) : armes, blocs, potions ; armure et pioche **permanentes à paliers** (la pioche perd 1 palier à la mort) ; monnaies Fer, Or, Diamant, Émeraude.
4. **Objets spéciaux** : **Boule de feu**, **Plateforme de secours** (bâton de blaze), **Lait magique** (immunité aux pièges 30 s), **Œuf-pont** (pont de laine de la couleur de l'équipe), **TNT** (s'amorce à la pose), **Dream Defender** (golem de fer allié), **Bedbug** (poisson d'argent). Les explosions (TNT, boule de feu) ne détruisent que laine, planches, terre cuite, verre/vitres, pierre de l'End, obsidienne, échelles, slime et éponges — le reste de la carte est protégé.
5. **Potions** avec **délai de réutilisation** par type (`balance.potion-cooldown-seconds`, 30 s).
6. **Pièges** (file de 3 par équipe, déclenchés à **8 blocs** du lit) et **Upgrades d'équipe** (voir §4.5).
7. **Lit détruit** → les membres de l'équipe ne réapparaissent plus ; **kill final** ; **élimination d'équipe** → **effondrement de l'île** (gel façon Hypixel, 4 styles).
8. **Timeline d'événements** (façon Hypixel) : Diamant II (6:00), Émeraude II (12:00), Diamant III (18:00), Émeraude III (24:00), **destruction des lits** (30:00), **mort subite** (35:00), **fin forcée** (40:00) — tous **réglables**.
9. **Déconnexion** : le joueur garde sa place `game.rejoin-grace` (120 s) et peut revenir (si son lit est encore là) ; sinon départ définitif.
10. **Fin de partie** : titre Victoire/Défaite, **résumé** (joueurs triés par kills, kills finaux, lits, MVP), feux d'artifice, **animation de victoire** du cosmétique choisi, puis retour au spawn (ou au lobby BungeeCord en Premium).

### 2.3 Progression et cosmétiques
- **Coins** (monnaie cosmétique) : `kill` 10, `kill final` 25, `lit détruit` 30, `participation` 15, `victoire` +100 (réglables dans `config.yml > coins`). Retour en barre d'action.
- **Menu `/cosmetics`** (alias `/cosmetiques`, `/cosmetic`) : 14 catégories, achat en coins, sélection, rareté colorée.
- **Rang & Elo** : `/bw stats [joueur]`, `/bw top [kills|wins|beds|deaths|elo]`, `/bw ranks` (échelle). Le **rang** s'affiche en **suffixe** (chat/TAB) et le **badge de prestige** + rang dans le **nom de TAB**.
- **Scoreboards** : lobby (rang, coins…) et en jeu (état des équipes, kills, prochain événement + compte à rebours).
- **Thèmes de messages** de kill/mort/lit/élimination (`classic`, `savage`, `fun`, `ecureuil`) — choisis par cosmétique et appliqués aux kills du joueur.

---

## 3. Vu de l'administrateur

### 3.1 Installation
1. Jar dans `plugins/` + **FastAsyncWorldEdit**. Redémarrer.
2. (Recommandé) **LuckPerms** ; (Premium) MySQL dans `config.yml > database` ; clé dans `license.key`.
3. Créer et configurer les arènes (§7).

### 3.2 Commandes

**`/bedwars` (alias `/bw`)** — joueur : `play`, `stats`, `top`, `ranks`/`rangs`, `join <FBW-code>`, `start-private <code>`, `leave`.
**Admin** (`bedwars.admin`, op) :

| Commande | Effet |
|---|---|
| `/bw create <nom>` | Crée une arène (**Free : 2 max**) |
| `/bw edit <arène>` / `edit stop` | **Éditeur en jeu** : marqueurs visuels + menu |
| `/bw setmode <arène> <mode>` | `SOLO_1V1`, `SOLO_4TEAMS`, `DUOS`, `SQUADS`, `SOLO`, `DOUBLES`, `TRIOS`, `QUADS`, `FOURS_2T` |
| `/bw settemplate <arène> <schem>` | Lie le schematic (`plugins/FondamentalBedwars/schematics/<schem>.schem`) |
| `/bw setorigin <arène>` | Origine = **centre exact** de la map (toutes les positions sont relatives) |
| `/bw setlobby <arène>` | Point de lobby d'attente |
| `/bw setspawn <arène> <équipe>` | Spawn d'équipe (`RED BLUE GREEN YELLOW AQUA WHITE PINK GRAY`) |
| `/bw setbed <arène> <équipe>` | Lit d'équipe (se tenir sur/à côté du lit) |
| `/bw addgenerator <arène> iron\|gold\|diamond\|emerald` / `removegenerator <arène> <id>` | Générateurs au sol |
| `/bw addteamgenerator <arène> <équipe>` / `removeteamgenerator` | Générateur d'équipe |
| `/bw setshop <arène> WEAPONS\|BLOCKS\|POTIONS\|TRAPS\|UPGRADES` / `removeshop <arène> <id>` | PNJ marchands |
| `/bw status <arène>` | Mode, prête ✔/✘, instances et joueurs |
| `/bw start <arène>` | Force le démarrage d'une instance en attente |
| `/bw tp <arène>` | Se téléporte dans le monde de l'arène |
| `/bw lb set\|remove <kills\|wins\|beds\|elo>` | **Hologramme de classement** (TextDisplay) à votre position, rafraîchi chaque minute depuis MySQL |
| `/bw reload` | Ferme éditeurs/parties, recharge config, textes, arènes |

**`/fbw`** (`fbw.admin`, op ; console OK) : `license [check]` · `reload` (config, textes, thèmes, cosmétiques, boutique, pack) · `givecosmetic <joueur> <catégorie:id>` (doublon → moitié du prix en coins) · `coins <add|set> <joueur> <n>` (joueur en ligne).
**`/cosmetics`** · **`/party`** : voir §2.

### 3.3 Permissions
Déclarées dans `plugin.yml` : `bedwars.admin` (op), `fbw.admin` (op). **Utilisées mais non déclarées** (à donner via LuckPerms) :
| Permission | Rôle |
|---|---|
| `bedwars.private` | Créer une partie privée |
| `bedwars.rank.vip`, `.vipp`, `.mvp`, `.mvpp`, `.mvppp` | Affichage du grade sur le scoreboard de lobby (VIP, VIP+, MVP, MVP+, MVP++) |
| `fbw.cosmetic.<catégorie>.<id>` | Possession d'un cosmétique (posée à l'achat/`givecosmetic`/crate) |
| `fbw.rank.<rang>` | Posée automatiquement selon l'Elo (exploitable par d'autres plugins) |

### 3.4 Placeholders (`fondamentalbedwars`)
`%fondamentalbedwars_elo%` · `_rank` · `_rank_id` · `_rank_colored` · `_coins`. **Lus depuis LuckPerms** (meta partagée réseau) → LuckPerms requis.

---

## 4. Personnalisation — les fichiers

Dans `plugins/FondamentalBedwars/` : `config.yml`, `messages.yml`, `cosmetics.yml`, `death-effects.yml`, `shop.yml`, `arenas/<nom>.yml`, `schematics/<nom>.schem`, `leaderboards.yml`, + `license-*`. `/fbw reload` recharge textes/cosmétiques/boutique ; `/bw reload` recharge aussi les arènes.

### 4.1 `config.yml`
| Clé | Défaut | Rôle |
|---|---|---|
| `license.{key,check-interval-hours,grace-hours}` | — / 6 / 72 | Licence (vide = Free, aucun appel réseau) |
| `countdown` / `min-players` | 30 / 2 | Compte à rebours et minimum de joueurs au niveau de l'instance de partie |
| `matchmaking.countdown` / `matchmaking.min-players` | 30 / 2 | Idem pour les files |
| `balance.potion-cooldown-seconds` | 30 | Délai entre 2 potions du même type (0 = off) |
| `game.rejoin-grace` | 120 | Délai de reconnexion (s) |
| `max-instances-per-arena` | 5 | Parties simultanées par arène (**Free : 1**) |
| `generators.{iron,gold,diamond,emerald}` | 20 / 60 / 1200 / 2400 | Ticks entre deux drops |
| `events.{diamond_ii,emerald_ii,diamond_iii,emerald_iii,bed_destruction,sudden_death,game_end}` | 360 … 2400 | Timeline (secondes depuis le début) |
| `holograms.{enabled,use-text-display}` | true / false | Hologrammes des générateurs |
| `bungee.{send-to-lobby,lobby-server}` | false / `lobby` | Renvoi BungeeCord (**Premium**) |
| `database.{enabled,host,port,name,username,password}` | — | MySQL (**Premium**), pool HikariCP (10 connexions) |
| `scoreboard.footer` | `&aFondamentalBedwars` | Pied de page (codes `&`) |
| `coins.{kill,final-kill,bed,win,play}` | 10/25/30/100/15 | Gains de coins |
| `rank-suffix.{enabled,scope}` | true / `server` | Suffixe de rang LuckPerms ; `server` exige un nom de serveur dans la config LuckPerms (`server: "bedwars"`), sinon `global` |
| `npc-skins.enabled` | true | Skin de PNJ marchand par joueur (**ProtocolLib**) |
| `resource-pack.{enabled,url,sha1,force,kick-on-decline,prompt}` | off | Pack de textures (cosmétiques), **hébergé par vous** (URL directe + SHA-1) |
| `island-collapse.{enabled,style,radius,depth,height,blocks-per-tick}` | true / `random` / 8 / 4 / 3 / 25 | Effondrement d'île (`ice`, `scorch`, `obsidian`, `crumble`, `random`) |
| `messages.{theme,themes.<nom>.…}` | `classic` | Thèmes de messages (voir 4.4) |
| `colors.*` | charte | Couleurs de `messages.yml` |

⚠️ `max-players-per-team` et `matchmaking.min-players-to-start` ne sont **lus nulle part** ; le fichier contient **deux blocs `matchmaking:`** (clé YAML dupliquée). Nettoyage recommandé.

### 4.2 `shop.yml` — la boutique (pilotée par données)
Articles simples : `{ name, material, amount, price, currency: IRON|GOLD|DIAMOND|EMERALD, enchant: {…}, potion: {type, level}, special: dreamdefender|bedbug }`. Slots à **paliers** : `progression: armor|pickaxe` + `tiers: [ {material, price, currency}… ]` (un slot montre le prochain palier). Trois sections : `weapons` (Épées, Arcs, Armures, Outils), `blocks` (Basiques, Défensifs, Utilitaires), `potions` (Vitesse, Force, Invisibilité, Sauts). **Les pièges et upgrades ne sont pas dans `shop.yml`** : ils sont **codés en dur** (§4.5). `/fbw reload` applique.

### 4.3 `cosmetics.yml` — 82 cosmétiques, 14 catégories
Chaque entrée : `{ name, icon, price (coins), rarity: COMMUN|RARE|EPIQUE|LEGENDAIRE|MYTHIQUE, data }` ; **ajouter un cosmétique = ajouter une ligne** (aucune recompilation). Permission générée `fbw.cosmetic.<catégorie>.<id>`.

| Catégorie | Id | # | `data` = |
|---|---|:-:|---|
| Effet de kill | `kill` | 3 | clé d'effet (`lightning`, `flame`, `soul`) |
| Élimination finale | `finalkill` | 5 | clé d'effet (`lightning`, `blood`, `soul`, `explosion`, `dragon`) |
| Destruction de lit | `bed` | 4 | `explosion`, `lightning`, `flames`, `firework` |
| Son de kill / de mort | `killsnd` / `deathsnd` | 4 / 3 | nom d'un `Sound` Bukkit |
| Animation de mort | `deathfx` | 6 | id d'une recette de `death-effects.yml` |
| Animation de victoire | `victory` | 7 | `fireworks`, `totem`, `stars`, `dragon`, `inferno`, `storm`, `hearts` |
| Traînée de projectile | `trail` | 6 | nom d'une `Particle` |
| Glyphe (ramassage diamant/émeraude) | `glyph` | 4 | nom d'une `Particle` |
| Ornement d'île | `island` | 6 | `Material` posé (sur armor stand) |
| Figurine d'île | `figurine` | 7 | `Material` de tête (ou texture base64) |
| Apparence des PNJ | `npcskin` | 16 | `EntityType` (Warden = mythique, 20 000 coins) |
| Thème de messages | `msgtheme` | 4 | nom d'un thème de `config.yml` |
| Badge de prestige | `prestige` | 7 | symbole coloré `&` affiché avant le pseudo en TAB |

Prix par défaut : 1 000 → **20 000 coins**. **`death-effects.yml`** définit des recettes de particules : `particle`, `count`, `spread`, `speed`, `sound`, `shape` (`burst`, `explosion`, `column`, `spiral`, `ring`), `height`, `duration` (6 recettes livrées).

### 4.4 Messages
- **`messages.yml`** (MiniMessage, variables `{arg}`, `{player}`, `{prefix}`…) : ~300 textes classés par domaine (`commande.*`, `fbw.*`, `groupe.*`, `file.*`, `partie.*`, `joueur.*`, `objets.*`, `amelioration.*`, `potions.*`…). `""` = message désactivé. Les clés manquantes sont ajoutées depuis le jar au chargement. Préfixe `[FBedwars]`.
- **Thèmes de jeu** (`config.yml > messages.themes.<thème>`) : clés `killed`, `void`, `death`, `bed-broken`, `elimination`, `final-kill-tag` ; **plusieurs variantes** tirées au hasard ; variables `{victim}`, `{killer}`, `{breaker}`, `{team}` ; codes `&`. Le propriétaire peut **ajouter ses propres thèmes** (puis un cosmétique `msgtheme` correspondant).

### 4.5 Ce qui est codé en dur (non configurable en YAML)
| Élément | Détail |
|---|---|
| **Pièges** (5, prix en diamants) | Alarme 2 · Anti-magie 2 · Dégâts (4 cœurs) 2 · Lenteur (8 s) 2 · Contre-offensive (Force I + Vitesse II, 10 s) 3 — rayon 8 blocs, file de 3 |
| **Upgrades d'équipe** (5) | Épée aiguisée (Tranchant I) 4 💎 · Armure renforcée (Protection I→IV) 2/4/8/16 · Mineur maniaque (Hâte I→II) 2/4 · **Forge** (×1,5/×2/×2,5/×3 ; diamant aux niveaux 3–4) 2/4/6/8 · Piscine de soin (régénération autour de la base) 1 |
| **Rangs Elo** | Bois 0 · Pierre 800 · Fer 1000 · Or 1200 · Diamant 1500 · Émeraude 1800 · Rubis 2100 · Légende 2500 ; Elo initial **1000**, coefficient **K = 32** |
| **Modes** | 9 modes (§3.2) ; équipes jusqu'à **8** couleurs (Rouge, Bleu, Vert, Jaune, Cyan, Blanc, Rose, Gris) |
| **Effets de cosmétiques** (kill/lit/victoire…) | Switch dans le code (les recettes de mort sont, elles, en YAML) |

---

## 5. Données, LuckPerms et MySQL (« le JSON » n'existe pas ici)

| Donnée | Où |
|---|---|
| **Arènes** | `arenas/<nom>.yml` : `mode`, `template`, `schematic-origin`, `lobby`, `spawns.<TEAM>`, `beds.<TEAM>`, `generators.<id>`, `team-generators.<TEAM>`, `shops.<id>.{location,type}` (positions sérialisées) |
| **Classement (hologrammes)** | `leaderboards.yml` (ancres) |
| **Stats** (kills, morts, victoires, défaites, lits, parties, **Elo**) | **MySQL** table `player_stats(uuid, username, kills, deaths, wins, losses, beds_destroyed, games_played, elo DEFAULT 1000, last_seen)` — **Premium** ; sans MySQL/en Free : **aucune persistance** (`/bw stats` affiche des zéros) |
| **Coins** | Meta LuckPerms `fbw-coins` |
| **Elo / rang** | Meta LuckPerms `fbw-elo`, `fbw-rank` + permission `fbw.rank.<rang>` + **suffixe** `[Rang]` (poids 50) |
| **Cosmétiques possédés** | Permissions LuckPerms `fbw.cosmetic.<cat>.<id>` |
| **Cosmétique sélectionné** | Meta LuckPerms `fbw-cos-<catégorie>` |

➡️ **LuckPerms est indispensable** pour les coins, cosmétiques, Elo affiché, rang et placeholders (avantage : tout est **partagé sur le réseau** sans base supplémentaire). Sans LuckPerms, achat/sélection de cosmétiques et coins sont inopérants.
Les stats MySQL sont écrites en **incréments SQL** (`kills = kills + ?`) : sûr en multi-serveurs.

---

## 6. Free vs Premium (vérifié dans le code)

| Fonction | Free | Premium |
|---|---|---|
| **Arènes** | **2 max** (vérifié à `/bw create`) | Illimité |
| **Instances simultanées / arène** | **1** | jusqu'à `max-instances-per-arena` (5) |
| **Matchmaking — modes** | Modes **1 joueur par équipe** seulement (1v1, 1v1v1v1, Solo 8 équipes) | Tous (Duos, Squads, Trios, Doubles…) |
| **Matchmaking classé (Elo, rangs)** | ❌ | ✅ |
| **Stats MySQL** (`/bw stats`, `/bw top`, hologrammes de classement, Elo persistant) | ❌ (non persistées) | ✅ |
| **BungeeCord** (renvoi lobby en fin de partie) | ❌ (spawn local) | ✅ |
| **Cosmétiques** | ❌ Tout cosmétique **payant** ou de rareté **≥ Épique** est verrouillé ; par défaut, seuls **5** cosmétiques « aucun/défaut » restent utilisables | ✅ Tous |
| Boucle de jeu, boutique, pièges, upgrades, party, parties privées, scoreboards, thèmes de messages (config), effondrement d'île, reconnexion, coins (gagnés), PAPI, éditeur d'arènes | ✅ | ✅ |

Changement d'édition à chaud : la connexion MySQL des stats est rebranchée automatiquement quand la licence passe Premium ; `/fbw reload` recharge cosmétiques et boutique selon l'édition (`/fbw reload` affiche l'édition courante).

---

## 7. Wiki d'utilisation

### A. Créer une arène (parcours complet)
1. **Construire la map** dans un monde de build, **coller/copier avec WorldEdit** :
   ```
   //copy          (debout au centre exact de la map)
   //schem save <nom_schematic>
   ```
   Copier `<nom_schematic>.schem` dans `plugins/FondamentalBedwars/schematics/`.
2. `/bw create <nom>` puis `/bw edit <nom>` (éditeur avec marqueurs) **ou** les commandes :
   ```
   /bw setmode <nom> DUOS
   /bw settemplate <nom> <nom_schematic>
   /bw setorigin <nom>            # au centre exact de la map !
   /bw setlobby <nom>
   /bw setspawn <nom> RED  ; /bw setspawn <nom> BLUE
   /bw setbed <nom> RED    ; /bw setbed <nom> BLUE
   /bw addgenerator <nom> iron|gold|diamond|emerald
   /bw addteamgenerator <nom> RED ; /bw addteamgenerator <nom> BLUE
   /bw setshop <nom> WEAPONS ; BLOCKS ; POTIONS ; TRAPS ; UPGRADES
   ```
3. Vérifier : `/bw status <nom>` (doit afficher « prête ✔ »). Tester : `/bw tp <nom>` puis `/bw join <nom>` (admin) ou passer par le menu `/bw play`.
> Le **jeu utilise un monde vide par partie** ; les positions sont transposées depuis l'origine. L'**éditeur** ne gère que **4 équipes** (Rouge/Bleu/Vert/Jaune) ; pour les modes 8 équipes, utiliser les **commandes** avec `AQUA`, `WHITE`, `PINK`, `GRAY`.

### B. Activer le classé et les rangs (Premium)
1. Licence Premium + MySQL (`database.*`). 2. LuckPerms avec un **nom de serveur** (`server: "bedwars"` dans `plugins/LuckPerms/config.yml`) si `rank-suffix.scope: server`, sinon `global`. 3. Les joueurs choisissent **Mode : Classé** dans `/bw play`. À la fin, l'Elo est mis à jour (formule d'espérance Elo, K=32, moyennes par camp gagnant/perdant) et publié dans LuckPerms ; message « +N Elo, rang X ».

### C. Ajouter un cosmétique
Ajouter une ligne dans `cosmetics.yml` sous la bonne catégorie (`monid: { name: "…", icon: MATERIAL, price: 2500, rarity: RARE, data: … }`), `/fbw reload`. Pour une **animation de mort** : créer la recette dans `death-effects.yml` puis `data: <id-recette>`.

### D. Changer les prix / articles de la boutique
Éditer `shop.yml` (`price`, `currency`, ajout d'entrées) → `/fbw reload`.

### E. Créer un thème de messages
`config.yml > messages.themes.montheme.{killed,void,death,bed-broken,elimination,final-kill-tag}` (listes de variantes, `{victim} {killer} {breaker} {team}`) ; activer globalement via `messages.theme: montheme` ou proposer un cosmétique `msgtheme` avec `data: montheme`.

### F. Offrir des cosmétiques / coins depuis la boutique
`fbw givecosmetic {username} kill:lightning` · `fbw coins add {username} 500` (joueur en ligne). Depuis **Crate** : action `type: cosmetic` (doublon → coins).

### G. Réseau BungeeCord (Premium)
`bungee.send-to-lobby: true`, `bungee.lobby-server: lobby` (nom dans Bungee). Stats et cosmétiques sont déjà partagés via MySQL/LuckPerms.

### H. Classement en hologramme
Au lobby, à l'endroit voulu : `/bw lb set kills|wins|beds|elo` (retirer : `/bw lb remove <stat>`). Rafraîchi chaque minute depuis MySQL (donc Premium).

### I. Pack de textures (cosmétiques)
Héberger un `.zip` public, renseigner `resource-pack.url` + `sha1` (recommandé) ; `enabled: true` ; `force`/`kick-on-decline` facultatifs ; `/fbw reload`.

---

## 8. Ce qui est réellement livré (inventaire vérifié)
**9 modes** · 8 couleurs d'équipe · générateurs sol + équipe avec **Forge** · **PNJ marchands** (skins par joueur via ProtocolLib) · boutique data-driven · 5 pièges · 5 upgrades · 7 objets spéciaux · timeline à 7 événements · **effondrement d'île** (4 styles) · **mondes instanciés** FAWE (`bedwars_<arène>_<n>`, nettoyage des mondes résiduels au démarrage) · **matchmaking** normal/classé · vote de map · **party** · **parties privées** · **reconnexion** · **scoreboards** lobby/jeu · **Elo/rangs** · **hologrammes de classement** · **82 cosmétiques** · coins · thèmes de messages · PAPI · anti-abus (vidage de l'ender chest entre parties, hologrammes protégés des flèches, hub qui ne reset pas créatif/spectateur).

## 9. Limites et points d'attention (spécifiques à Bedwars)
1. **LuckPerms quasi obligatoire** (sinon ni coins, ni cosmétiques, ni rang, ni placeholders) — à afficher clairement dans les prérequis.
2. **FAWE obligatoire** ; le plugin crée/supprime des mondes à chaque partie (charge disque, prévoir SSD).
3. **Free : 2 arènes** vérifiées seulement à la création (copier des `arenas/*.yml` la contourne).
4. **Free : cosmétiques quasi inutilisables** (5 « défaut ») malgré le README « Commun/Rare ».
5. Permissions `bedwars.private`, `bedwars.rank.*`, `fbw.cosmetic.*` **non déclarées** dans `plugin.yml` ; libellé « MVP+ » du menu alors que la vraie condition est `bedwars.private`.
6. **Éditeur limité à 4 équipes** ; modes 8 équipes par commandes.
7. Config : clés mortes (`max-players-per-team`, `matchmaking.min-players-to-start`) et bloc `matchmaking:` en double.
8. `/bw stats` / `/bw top` / hologrammes de classement **dépendent de MySQL (Premium)**.
9. Le chat en partie remplace le format (`[Équipe] pseudo: msg`) et isole les destinataires ; hors partie, le chat reste au plugin de chat du serveur (voir FondamentalTag).
10. Sur un serveur Bedwars, FondamentalTag doit avoir `nametag.enabled: false` (équipes scoreboard gérées par Bedwars).
11. Le dossier `AdvancedSlimePaper` est un lien de sous-module **orphelin** (aucun usage).
12. Version `1.0-SNAPSHOT` : à figer avant la mise en vente.

## 10. Écarts README ↔ code
| Sujet | README | Code |
|---|---|---|
| Modes | 4 (`SOLO_1V1`, `SOLO_4TEAMS`, `DUOS`, `SQUADS`) | **9** (+ `SOLO`, `DOUBLES`, `TRIOS`, `QUADS`, `FOURS_2T`) |
| Upgrades | Armure 3 niveaux (4/8/16), Épée 2 niveaux (4/8), Hâte 2, Forge | Armure **4** niveaux (2/4/8/16), Épée **1** niveau (4), Hâte 2 (2/4), Forge **4** (2/4/6/8), **+ Piscine de soin** |
| Pièges | 5 | 5 ✅ |
| Cosmétiques Free | « Commun / Rare » | Tout cosmétique **payant** verrouillé (+ rareté ≥ Épique) |
| Éditeur | « Éditeur in-game … au marqueur » | ✅ mais 4 équipes seulement |
| Fonctions absentes du README | — | Elo/rangs/classé, party, parties privées, hologrammes de classement, skins de PNJ, thèmes de messages, coins, effondrement d'île, reconnexion, `/fbw`, `/cosmetics`, PAPI (mentionné en roadmap), pack de textures |
| Compilation | `fondamentalbedwars-1.0-SNAPSHOT.jar` | Distribuer le `*-obf.jar` (paquet de licence obfusqué) |
| Prérequis | FAWE, MySQL | + **LuckPerms** (quasi requis), ProtocolLib (facultatif) |

## 11. Arguments de vente vérifiés
**Bedwars complet clé en main** (9 modes, 8 équipes) · **matchmaking + classé Elo + 8 rangs** · **82 cosmétiques** (effets de kill/lit/mort/victoire, traînées, PNJ skinnés, ornements, prestige) · **boutique 100 % data-driven** · **mondes instanciés** (aucun conflit entre parties) · **multi-instances** · party + **parties privées par code** · **reconnexion** · timeline façon Hypixel **réglable** · effondrement d'île · **thèmes de messages** humoristiques · stats/Elo/coins **partagés réseau** (MySQL + LuckPerms) · **hologrammes de classement**.
