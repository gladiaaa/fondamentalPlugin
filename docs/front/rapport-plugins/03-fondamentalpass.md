# 🎫 FondamentalPass — rapport détaillé

**Version analysée** : 1.0.0 (`pom.xml`) · **Paper** 1.21.4+ · **Java** 21 · **Un seul jar** (`fondamentalpass-1.0.0-obf.jar`) : l'édition dépend **uniquement de la clé de licence** · ID licence : `pass`
Dépôt jeune : 3 commits (`main` = release 1.0.0).

---

## 1. En bref

**Pass de saison + quêtes** pour serveurs Paper, pensé pour les **réseaux** : la même progression sur tous les serveurs (lobby, mini-jeux, survie…), des quêtes qui fonctionnent avec **n'importe quel plugin**, et des liaisons avec la gamme Fondamental (Tag, Crate).

- **Saison** : dates de début/fin, paliers d'XP, **piste gratuite** et **piste premium**.
- **Quêtes** quotidiennes, hebdomadaires et de saison, **tirées au hasard** (pondéré) dans des pools configurables.
- **Réseau** : base MySQL partagée, **verrou de profil** lors des changements de serveur, quêtes limitées à certains serveurs.
- Menus aux couleurs de la charte, textes modifiables, PlaceholderAPI, **API Java** et événements Bukkit.

### ⚠️ Deux notions de « premium » à ne pas confondre (à expliquer sur le site)
| | **Édition Premium du plugin** | **Piste premium du pass** |
|---|---|---|
| Qui l'achète ? | Le **propriétaire du serveur** (licence) | Le **joueur** (vendu par le serveur, ex. sur sa boutique Tebex) |
| Comment ça s'active ? | `license.key` dans `config.yml` | Permission `fondamentalpass.premium` (nom réglable dans `season.yml`) |
| Effet | Débloque des fonctions du plugin (§6) | Débloque la 2e rangée de récompenses du pass |

**La piste premium exige les deux** : édition Premium du plugin **et** permission du joueur (`hasPremium = edition Premium && permission`). En édition Free, la piste premium est **grisée pour tout le monde**.

---

## 2. Vu du joueur

| Action | Comment |
|---|---|
| Ouvrir le pass | `/pass` (alias `/battlepass`, `/bp`) → menu 45 cases, **7 paliers par page**, s'ouvre sur le prochain palier à atteindre |
| Lire le menu | Ligne du haut = **piste gratuite**, ligne du bas = **piste premium**, ligne du milieu = marqueurs de palier ; en-tête = résumé (palier, XP, premium oui/non) |
| Récupérer une récompense | Clic sur la récompense d'un palier atteint |
| Tout récupérer | Bouton « tout récupérer » ou `/pass recuperer` |
| Voir ses quêtes | `/quetes` (alias `/quests`, `/quest`) ou `/pass quetes` |
| Notifications | Barre d'action à chaque **quart** d'une quête franchi ; message + titre à la **montée de palier** ; rappel à la connexion s'il reste des récompenses (`join-reminder`) ; son à la quête terminée |

**Quêtes** : chaque pool a un rythme (`daily` = renouvelé chaque jour à `reset-hour`, `weekly` = chaque **lundi**, `season` = jamais) et un nombre de quêtes **tirées au hasard** par joueur (`amount: 3`, ou `all`). Une quête terminée donne de l'**XP** (et éventuellement des récompenses) ; l'XP fait monter les paliers.

Quand le pass est en cours de chargement (connexion) : message « réessaie dans un instant ».

---

## 3. Vu de l'administrateur

### 3.1 Installation
1. Jar dans `plugins/` → premier démarrage : `config.yml`, `season.yml`, `quests.yml`, `messages.yml`.
2. Régler `server.name` (**unique** sur le réseau), `timezone`, `reset-hour`.
3. Éditer `season.yml` (paliers/récompenses) et `quests.yml` (pools/quêtes) → `/pass admin reload` (l'ancienne config reste active si la nouvelle est invalide).
4. Premium : `license.key`.

### 3.2 Commandes
| Commande | Permission | Rôle |
|---|---|---|
| `/pass` · `/battlepass` · `/bp` | — | Ouvre le pass |
| `/quetes` · `/quests` · `/quest` (ou `/pass quetes`) | — | Quêtes du moment |
| `/pass recuperer` (`claim`) | — | Récupère toutes les récompenses disponibles |
| `/pass aide` | — | Aide |
| `/pass admin reload` | `fondamentalpass.admin` | Recharge config, textes, saison, quêtes |
| `/pass admin xp <give\|take\|set> <joueur> <n>` | admin | Gère l'XP (joueur **en ligne** sur ce serveur) |
| `/pass admin reset <joueur>` | admin | Remet un pass à zéro (XP, récupérations, quêtes) |
| `/pass admin trigger <joueur> <clé> [n]` | admin, **Premium** | Fait avancer un objectif `custom` |
| `/pass admin info` | admin | Édition, stockage, nom du serveur, saison, état, palier, pools, quêtes, profils chargés |
| `/pass admin license [check]` | admin | Statut / revérification de la licence |

### 3.3 Permissions
| Permission | Défaut | Rôle |
|---|---|---|
| `fondamentalpass.premium` | **personne** | Ouvre la piste premium (réglable par saison : `season.premium-permission`) |
| `fondamentalpass.admin` | op | Commandes `/pass admin` |

### 3.4 Placeholders (`%fpass_…%`)
`level` · `max_level` · `xp` (dans le palier) · `xp_needed` · `xp_total` · `progress` (%) · `premium` (oui/non, textes `placeholder-yes/no`) · `claimable` · `season` · `season_id` · `season_remaining` · `quests_done_<pool>` · `quests_total_<pool>`.
*(Les valeurs de profil sont vides si le joueur n'est pas chargé sur ce serveur.)*

### 3.5 API et événements pour développeurs
```java
FondamentalPassApi.progress(player, "bedwars:win", 1);   // fait avancer les quêtes {type: custom, key: "bedwars:win"} — PREMIUM
FondamentalPassApi.addXp(player, 250);                   // ajoute (ou retire) de l'XP
int level = FondamentalPassApi.level(player);            // -1 si profil non chargé
FondamentalPassApi.hasPremium(player);  FondamentalPassApi.seasonId();  FondamentalPassApi.isAvailable();
```
Événements Bukkit : `PassLevelUpEvent`, `QuestCompleteEvent`. Appels à faire depuis le thread principal (l'API replanifie sinon).

---

## 4. Personnalisation — les fichiers

### 4.1 `config.yml`
| Clé | Défaut | Rôle |
|---|---|---|
| `license.{key,check-interval-hours,grace-hours}` | — / 6 / 72 | Licence |
| `server.name` | `"serveur"` | Nom **unique** de CE serveur (quêtes ciblées + verrou de profil) |
| `storage.type` | `sqlite` | `sqlite` (`data.db`, 1 serveur) ou `mysql` (**Premium**, réseau) |
| `storage.table-prefix` | `fpass_` | Préfixe des tables |
| `storage.mysql.*` | — | `host`, `port`, `database`, `user`, `password`, `pool-size` (5) |
| `storage.autosave-seconds` | 60 | Sauvegarde des profils modifiés |
| `storage.lock-wait-seconds` / `lock-stale-seconds` | 10 / 180 | Attente du serveur précédent / péremption d'un verrou (serveur planté) |
| `timezone` | `Europe/Paris` | Fuseau (dates de saison, renouvellements) |
| `reset-hour` | 0 | Heure (0–23) du renouvellement quotidien ; l'hebdo tombe le **lundi** |
| `auto-claim` | false | Récupère automatiquement à chaque palier |
| `afk-excludes-playtime` | true | Le temps de jeu ne compte pas après **5 min** d'inactivité |
| `placeholder-interval-seconds` | 30 | Relevé des objectifs `placeholder` (Premium) |
| `notifications.{progress-actionbar,join-reminder}` | true | Retours joueur |
| `hooks.crate-key-command` | `crate give {player} {crate} {amount}` | Commande console d'une récompense `crate-key` |
| `colors.*`, `menus.{border,accent}` | charte | Couleurs ; vitres des menus (`BLACK_STAINED_GLASS_PANE` / `PURPLE_STAINED_GLASS_PANE`) |

### 4.2 `season.yml` — la saison et ses paliers
```yaml
season:
  id: "saison-1"                      # CHANGER l'id = nouvelle saison, tout le monde repart de zéro
  name: "<degrade>Saison 1</degrade> <discret>·</discret> <fort>Les Origines"
  start: "2026-10-01 00:00"           # AAAA-MM-JJ HH:MM dans le fuseau de config.yml
  end:   "2026-12-31 23:59"
  xp-per-tier: 1000                   # XP par palier (un palier peut la remplacer via xp:)
  max-level: 30                       # Free : 30 max
  premium-permission: "fondamentalpass.premium"

tiers:
  10:
    xp: 1500                          # XP pour CE palier
    free:                             # piste gratuite (facultative)
      name: "<fort>Diamants"
      icon: DIAMOND
      lore: ["<texte>…"]
      rewards: [ {type: item, material: DIAMOND, amount: 5} ]
    premium:                          # piste premium (facultative)
      name: "<degrade>Clé de crate Mythique</degrade>"
      icon: END_CRYSTAL
      rewards: [ {type: crate-key, crate: "mythic", amount: 1} ]
```
- Un palier sans section n'a pas de récompense (l'XP nécessaire reste `xp-per-tier`).
- `season.id` : `[A-Za-z0-9_.-]{1,64}`. **L'ancienne progression reste en base** (clé `(uuid, season)`).
- Hors dates (`start`/`end`), la saison est « hors saison » : quêtes et récupérations **inactives**.
- **Types de récompenses** (`rewards:`) :

| `type` | Paramètres | Effet | Édition |
|---|---|---|---|
| `money` | `amount` | Argent **Vault** | Free+Premium |
| `item` | `material`, `amount`, `name`, `lore` | Objet (déborde au sol si inventaire plein) | Free+Premium |
| `command` | `command`, `as: console\|player` | Commande (`{player}`, `{uuid}`) | Free+Premium |
| `message` | `message` | Message MiniMessage | Free+Premium |
| `tag` | `tag`, `duration` (`7d`, `12h`, `30m`, `90s` ; vide = permanent) | Tag **FondamentalTag** (≥ 2.1.0) | **Premium** |
| `crate-key` | `crate`, `amount` | Clés **FondamentalCrate** (via commande console) | **Premium** |

### 4.3 `quests.yml` — pools et quêtes
```yaml
pools:
  daily:  { name: "Quêtes du jour",  icon: SUNFLOWER, reset: daily,  amount: 3 }
  weekly: { name: "Quêtes de la semaine", icon: CLOCK, reset: weekly, amount: 3 }
  season: { name: "Défis de saison", icon: NETHER_STAR, reset: season, amount: all }

quests:
  mineur:
    pool: daily
    name: "Mineur"
    description: "<texte>Casse <fort><amount></fort> blocs de pierre."   # <amount> = quantité
    icon: IRON_PICKAXE
    xp: 250                          # XP donnée à la fin
    weight: 10                       # chance d'être tirée (défaut 10)
    servers: ["bedwars-*"]           # facultatif : serveurs où la quête progresse (motifs *)
    rewards: [ {type: money, amount: 100} ]     # facultatif : en plus de l'XP
    objective: {type: break-block, amount: 200, materials: [STONE, DEEPSLATE]}
```
**Objectifs** (`objective.type`) — **13 vanilla** (Free+Premium) :

| Type | Compte | Détails |
|---|---|---|
| `break-block` | blocs cassés | Un bloc **posé par un joueur** ne compte pas s'il le recasse (anti-abus) |
| `place-block` | blocs posés | |
| `kill-mob` | mobs tués | Filtre `entities` |
| `kill-player` | joueurs tués | |
| `craft` | objets fabriqués | Compte le shift-clic |
| `fish` | poissons pêchés | |
| `smelt` | objets fondus (récupérés au four) | |
| `enchant` | objets enchantés | |
| `consume` | objets consommés | Filtre `items` |
| `breed` | animaux reproduits | |
| `playtime` | **minutes** de jeu | Hors inactivité (5 min) et hors mort |
| `walk` | **blocs** parcourus | Pas en vol, en véhicule, ni téléportation (> 10 blocs) |
| `login` | **jours** de connexion | Une fois par jour de jeu |

+ **2 objectifs Premium** : `custom` (clé envoyée par l'API, `/pass admin trigger` ou un plugin) et `placeholder` (valeur d'un placeholder PlaceholderAPI relevée toutes les 30 s ; `mode: increase` = compter la hausse depuis le tirage, `mode: reach` = atteindre la valeur).
Filtres facultatifs : `materials`, `entities`, `items` (noms Minecraft). Les événements en **créatif/spectateur** ne comptent pas. Une quête dont l'objectif est inconnu/invalide est **ignorée avec un avertissement** au chargement.

### 4.4 `messages.yml`
Tous les textes (menus compris), MiniMessage, préfixe `[FPass]`, variables `<quest>`, `<xp>`, `<level>`, `<max>`, `<count>`, `<bar>`, `<progress>`, `<amount>`… `""` désactive un message.

---

## 5. Données : « le JSON » et le réseau

### Stockage
Table unique `fpass_profiles` (préfixe configurable), clé primaire **`(uuid, season)`** :

| Colonne | Contenu |
|---|---|
| `uuid`, `season` | Joueur et saison |
| **`data`** | **Profil du joueur sérialisé en JSON** (Gson) — `TEXT` (SQLite) / `MEDIUMTEXT` (MySQL) |
| `locked_by` | Nom du serveur qui détient le profil (verrou) |
| `locked_at`, `updated_at` | Horodatages |

**Contenu JSON d'un profil** (structure réelle de `PassProfile`) :
```json
{
  "uuid": "069a79f4-44e9-4726-a5be-fca90e38aaf5",
  "season": "saison-1",
  "xp": 3450,
  "claimedFree": [1, 2, 3],
  "claimedPremium": [1],
  "pools": {
    "daily": {
      "period": "D2026-10-03",
      "quests": [ { "quest": "mineur", "progress": 120, "completed": false }, { "quest": "pecheur", "progress": 10, "completed": true } ]
    },
    "season": { "period": "Ssaison-1", "quests": [ { "quest": "champion-bedwars", "progress": 4, "completed": false } ] }
  },
  "lastLoginDay": "D2026-10-03"
}
```
`period` = clé de renouvellement (`D<date>`, `W<année>-<semaine>`, `S<saison>`) ; quand elle ne correspond plus à la période courante, les quêtes du pool sont retirées et un nouveau tirage est fait. Pour un objectif `placeholder` en mode `increase`, un champ `baseline` mémorise la valeur de départ. Les profils ne vivent en mémoire que **là où le joueur joue** ; sauvegarde périodique + à la déconnexion, **hors thread principal**.

### Multi-serveurs (MySQL, Premium)
1. Sur **chaque** serveur : `storage.type: mysql` avec la **même base** + un `server.name` **unique**.
2. Les quêtes `servers: ["bedwars-*"]` ne progressent que sur les serveurs dont le nom correspond ; **ailleurs, le menu indique où les faire**.
3. **Changement de serveur** : le proxy connecte le joueur au serveur B *avant* de le déconnecter de A, qui sauvegarde alors. B attend que A ait relâché le **verrou** (`locked_by`, jusqu'à `lock-wait-seconds`) ; un verrou plus vieux que `lock-stale-seconds` est jugé abandonné (serveur planté) et **repris d'office** avec un avertissement. Les sauvegardes ne s'appliquent que si le serveur **détient encore le verrou** → jamais d'écrasement par une version périmée. Un battement (`heartbeat`) rafraîchit les verrous des joueurs connectés.
4. Si MySQL est injoignable : **repli sur SQLite** (progression non partagée) avec avertissement.

---

## 6. Free vs Premium (vérifié dans le code)

| Fonction | Free | Premium |
|---|:---:|:---:|
| **Paliers par saison** | **30 max** (`max-level` plafonné, avertissement) | Illimité |
| **Piste premium du pass** | ❌ (grisée pour tous) | ✅ (+ permission joueur) |
| Stockage | SQLite | SQLite **ou MySQL** (réseau + verrou) |
| 13 objectifs vanilla | ✅ | ✅ |
| Objectifs **`custom`** (API, `/pass admin trigger`) | ❌ (quête **ignorée** au chargement) | ✅ |
| Objectifs **`placeholder`** (PlaceholderAPI) | ❌ (quête **ignorée**) | ✅ |
| Récompenses `money`, `item`, `command`, `message` | ✅ | ✅ |
| Récompenses **`tag`** et **`crate-key`** | ❌ (**ignorées**, voir ⚠️) | ✅ |
| `FondamentalPassApi.progress()` | sans effet | ✅ |
| `addXp`, `level`, `hasPremium`, événements, placeholders `%fpass_…%`, quêtes multi-serveurs (`servers:`) | ✅ | ✅ |

⚠️ **Piège Free** : `PassService.claim()` marque le palier « récupéré » **avant** de remettre les récompenses ; en Free une récompense `tag`/`crate-key` est ignorée (avertissement console) → **le joueur perd la récompense**. Le `season.yml` livré met un `crate-key` (palier 5) et un `tag` (palier 30) dans la piste **gratuite** : sur un serveur Free, ces paliers ne donnent **rien**.

**Changement d'édition à chaud** : quand la vérification de licence fait passer FREE ↔ PREMIUM, saison et quêtes sont **rechargées automatiquement** pour réappliquer les limites. Au démarrage avec MySQL demandé et sans cache de licence, le plugin **attend jusqu'à 5 s** la première vérification.

---

## 7. Wiki d'utilisation (recettes)

### A. Lancer sa première saison
1. `season.yml` : régler `id`, `name`, `start`/`end`, `xp-per-tier`, `max-level`.
2. Définir des paliers (`tiers:`) avec `free` et/ou `premium`.
3. `quests.yml` : ajuster pools et quêtes.
4. `/pass admin reload` puis `/pass admin info` (vérifier « saison en cours »).

### B. Vendre le pass premium
Sur la boutique : `lp user {username} permission set fondamentalpass.premium true` (ou temporaire via LuckPerms). **Rappel** : nécessite l'édition **Premium** du plugin, sinon la piste reste fermée.

### C. Vendre de l'XP / faire un event « XP x2 »
`pass admin xp give {username} 1000` (joueur en ligne). Pour un bonus général : commande console en boucle sur les connectés, ou objectif `custom` avec `/pass admin trigger`.

### D. Cibler un mini-jeu
Nommer le serveur `server.name: "bedwars-1"` ; quête `servers: ["bedwars-*"]`. Sur le lobby, le menu indique où faire la quête.

### E. Quête basée sur n'importe quel plugin (Premium)
```yaml
objective: { type: placeholder, placeholder: "%vault_eco_balance%", amount: 10000, mode: reach }
```
ou `mode: increase` pour « gagne 500 pièces aujourd'hui ». Relevé toutes les `placeholder-interval-seconds`.

### F. Faire avancer une quête depuis un autre plugin
`FondamentalPassApi.progress(player, "ma:cle", 1)` avec `objective: {type: custom, key: "ma:cle", amount: 20}`. En test : `/pass admin trigger <joueur> ma:cle 5`.

### G. Réseau
Voir §5 (même base, `server.name` unique, un serveur par nom).

### H. Nouvelle saison
Changer `season.id` (+ dates) → `/pass admin reload` : les profils sont rechargés, **l'ancienne saison reste en base**.

---

## 8. Limites et points d'attention (spécifiques à Pass)
1. **Bedwars et Crate n'envoient AUCUN événement au Pass** (`bedwars:win`, `bedwars:bed_break`, `crate:open` : 0 appel dans les dépôts, historique compris). Les 3 quêtes `custom` d'exemple **ne progressent pas** sans `/pass admin trigger` ou intégration tierce.
2. README : « liaisons natives (Tag, Crate, Bedwars) » → réalité : **Tag** (API, récompense `tag`) et **Crate** (commande `crate give`, récompense `crate-key`), **pas Bedwars**.
3. **Récompenses Free perdues** (voir §6).
4. Le `season.yml` par défaut référence des tags **inexistants** dans Tag par défaut (`pionnier`, `saison1` ; `legende` existe).
5. `crate-key` passe par une **commande console** : la crate cible doit exister et le joueur être **en ligne** (`crate give` n'accepte que les joueurs connectés).
6. `/pass admin xp|reset|trigger` : joueur **en ligne sur ce serveur** uniquement (profils non partagés hors de leur serveur).
7. **Un seul profil par saison** : changer de `season.id` en cours de route remet tout le monde à zéro (voulu).
8. Un serveur qui **oublie** de définir `server.name` (reste `serveur`) : avertissement en MySQL, mais les verrous de plusieurs serveurs se confondraient.
9. Le pack shader de FondamentalTag : Pass décale d'un cran les couleurs que le shader animerait, pour qu'elles restent fixes (si Tag + pack sont installés).

## 9. Arguments de vente vérifiés
Pass de saison **réseau** avec **verrou de profil** (pas de perte au changement de serveur) · **piste gratuite + piste premium vendable** (une permission) · quêtes **quotidiennes / hebdo / saison** à tirage **pondéré** · **13 objectifs** natifs + `placeholder` (n'importe quel plugin) + `custom` (API) · quêtes **ciblées par serveur** · anti-abus (bloc posé/cassé, créatif, AFK) · menus paginés · placeholders complets · API + événements · aucun SQL sur le thread principal.
