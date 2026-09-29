import type { ConfigField } from '@fondamental/shared';
import {
  bool,
  colorsSection,
  decimal,
  int,
  licenseSection,
  material,
  mm,
  mysqlFields,
  section,
  select,
  text,
} from './fields.js';

/**
 * Les `config.yml` des quatre plugins. Seules les options utiles au propriétaire sont proposées : le
 * reste du fichier (animations de Crate, thèmes de Bedwars…) est repris tel qu'il est livré.
 */

export const bedwarsConfig1_0: ConfigField[] = [
  licenseSection(),
  int('countdown', 'Compte à rebours de la salle d’attente (s)', { min: 5, max: 300 }),
  int('min-players', 'Joueurs minimum dans la salle d’attente', { min: 1, max: 32 }),
  section('matchmaking', 'Files d’attente', [
    int('countdown', 'Compte à rebours (s)', { min: 5, max: 300 }),
    int('min-players', 'Joueurs minimum pour lancer le compte à rebours', { min: 1, max: 32 }),
  ]),
  section('balance', 'Équilibrage', [
    int('potion-cooldown-seconds', 'Délai entre deux potions du même type (s)', { min: 0, max: 600, help: '0 = aucun délai.' }),
  ]),
  section('game', 'Partie', [int('rejoin-grace', 'Délai de reconnexion (s)', { min: 0, max: 900 })]),
  int('max-instances-per-arena', 'Parties simultanées par arène', { min: 1, max: 50, premium: true, help: '1 en édition Free.' }),
  section('generators', 'Générateurs (ticks entre deux apparitions, 20 = 1 s)', [
    int('iron', 'Fer', { min: 1, max: 72000 }),
    int('gold', 'Or', { min: 1, max: 72000 }),
    int('diamond', 'Diamant', { min: 1, max: 72000 }),
    int('emerald', 'Émeraude', { min: 1, max: 72000 }),
  ]),
  section('holograms', 'Hologrammes des générateurs', [
    bool('enabled', 'Activés'),
    bool('use-text-display', 'Utiliser les TextDisplay'),
  ]),
  section('bungee', 'Réseau', [
    bool('send-to-lobby', 'Renvoyer au lobby en fin de partie', { premium: true }),
    text('lobby-server', 'Nom du serveur lobby dans le proxy', { showIf: { key: 'send-to-lobby', equals: true } }),
  ]),
  section('database', 'Base MySQL (statistiques, classé)', [
    bool('enabled', 'Activée', { premium: true }),
    text('host', 'Hôte'),
    int('port', 'Port', { min: 1, max: 65535 }),
    text('name', 'Base'),
    text('username', 'Utilisateur'),
    text('password', 'Mot de passe', { help: 'Écrit tel quel dans le fichier généré.' }),
  ]),
  section('events', 'Calendrier des événements (secondes depuis le début)', [
    int('diamond_ii', 'Diamants II', { min: 0, max: 7200 }),
    int('emerald_ii', 'Émeraudes II', { min: 0, max: 7200 }),
    int('diamond_iii', 'Diamants III', { min: 0, max: 7200 }),
    int('emerald_iii', 'Émeraudes III', { min: 0, max: 7200 }),
    int('bed_destruction', 'Destruction des lits', { min: 0, max: 7200 }),
    int('sudden_death', 'Mort subite', { min: 0, max: 7200 }),
    int('game_end', 'Fin de la partie', { min: 0, max: 7200 }),
  ]),
  section('scoreboard', 'Scoreboard', [text('footer', 'Pied de page', { help: 'Codes couleur « & ».' })]),
  section('coins', 'Coins gagnés', [
    int('kill', 'Kill', { min: 0, max: 100000 }),
    int('final-kill', 'Kill final', { min: 0, max: 100000 }),
    int('bed', 'Lit détruit', { min: 0, max: 100000 }),
    int('win', 'Victoire', { min: 0, max: 100000 }),
    int('play', 'Participation', { min: 0, max: 100000 }),
  ]),
  section('rank-suffix', 'Rang en suffixe (LuckPerms)', [
    bool('enabled', 'Activé'),
    select('scope', 'Portée', [
      { value: 'server', label: 'Ce serveur (nom de serveur requis dans LuckPerms)' },
      { value: 'global', label: 'Tout le réseau' },
    ]),
  ]),
  section('npc-skins', 'Apparence des marchands', [bool('enabled', 'Choisie par cosmétique (ProtocolLib)')]),
  section('resource-pack', 'Pack de textures', [
    bool('enabled', 'Activé'),
    text('url', 'Adresse directe du zip', { showIf: { key: 'enabled', equals: true } }),
    text('sha1', 'Empreinte SHA-1', { pattern: '^[0-9a-fA-F]{40}$', showIf: { key: 'enabled', equals: true } }),
    bool('force', 'Obligatoire'),
    bool('kick-on-decline', 'Expulser en cas de refus'),
    text('prompt', 'Message de demande', { help: 'Codes couleur « & ».' }),
  ]),
  section('island-collapse', 'Effondrement des îles éliminées', [
    bool('enabled', 'Activé'),
    select('style', 'Style', ['random', 'ice', 'scorch', 'obsidian', 'crumble']),
    int('radius', 'Rayon (blocs)', { min: 1, max: 64 }),
    int('depth', 'Profondeur (blocs)', { min: 0, max: 64 }),
    int('height', 'Hauteur (blocs)', { min: 0, max: 64 }),
    int('blocks-per-tick', 'Blocs par tick', { min: 1, max: 1000 }),
  ]),
  section('messages', 'Messages de jeu', [
    text('theme', 'Thème par défaut', { help: 'classic, savage, fun, ecureuil, ou un thème ajouté dans ce fichier.' }),
  ]),
  colorsSection(),
];

export const tagConfig2_1: ConfigField[] = [
  licenseSection(),
  section('database', 'Base de données', [
    select('type', 'Type', [
      { value: 'sqlite', label: 'SQLite (un serveur)' },
      { value: 'mysql', label: 'MySQL (réseau)', premium: true },
    ]),
    section('mysql', 'MySQL', mysqlFields('username'), { showIf: { key: 'type', equals: 'mysql' } }),
  ]),
  section('chat', 'Chat', [
    bool('enabled', 'Format de chat de FondamentalTag', { help: 'Désactivez si un autre plugin gère le chat.' }),
    mm('format', 'Format', { help: '{tag}, <player>, <message>.' }),
    mm('tag-format', 'Format du tag', { help: '{tag} = le tag.' }),
  ]),
  section('nametag', 'Au-dessus de la tête et TAB', [
    bool('enabled', 'Activé', { help: 'Désactivez sur un serveur Bedwars ou avec le plugin TAB.' }),
    mm('format', 'Format'),
    bool('cleanup-legacy-teams', 'Supprimer les équipes de TagsCustom 1.x'),
  ]),
  section('placeholders', 'Placeholders', [
    text('no-tag', 'Valeur sans tag équipé'),
    bool('legacy-identifier', 'Garder les anciens %tags_…%'),
  ]),
  section('resource-pack', 'Pack de ressources', [
    bool('enabled', 'Activé', { premium: true }),
    bool('shader-effects', 'Animations par shaders'),
    bool('send-on-join', 'Envoyer à la connexion'),
    bool('required', 'Obligatoire (expulse en cas de refus)'),
    mm('prompt', 'Message de demande'),
    section('host', 'Hébergement par le plugin', [
      bool('enabled', 'Le plugin héberge le pack'),
      int('port', 'Port (à ouvrir dans le pare-feu)', { min: 1, max: 65535 }),
      text('public-url', 'Adresse vue par les joueurs', { placeholder: 'http://1.2.3.4:8095' }),
    ]),
    text('external-url', 'Ou : adresse d’un zip hébergé ailleurs'),
  ]),
  section('menu', 'Menus', [
    bool('show-locked', 'Afficher les tags verrouillés'),
    bool('show-premium', 'Afficher les tags Premium en édition Free'),
    bool('skip-single-category', 'Une seule catégorie : l’ouvrir directement'),
    bool('close-on-equip', 'Fermer le menu après avoir équipé'),
    bool('sort-by-rarity', 'Les plus rares en premier'),
    section('items', 'Objets des menus', [
      material('unlocked', 'Tag débloqué'),
      material('equipped', 'Tag équipé'),
      material('locked', 'Tag verrouillé'),
      material('buyable', 'Tag en vente'),
      material('premium', 'Tag Premium (édition Free)'),
      material('current', 'Tag actuel'),
      material('back', 'Retour'),
      material('previous', 'Page précédente'),
      material('next', 'Page suivante'),
      material('close', 'Fermer'),
      material('border', 'Cadre'),
      material('accent', 'Coins du cadre'),
      material('owned', 'Mes tags'),
      material('atelier', 'Atelier'),
      material('balance', 'Solde'),
    ]),
    section('sounds', 'Sons (vide = aucun)', [
      text('open', 'Ouverture'),
      text('equip', 'Équiper'),
      text('unequip', 'Retirer'),
      text('error', 'Erreur'),
      text('preview', 'Aperçu'),
      text('buy', 'Achat'),
    ]),
  ]),
];

export const crateConfig1_2: ConfigField[] = [
  licenseSection(),
  section('settings', 'Comportement', [
    bool('one-open-at-a-time', 'Une ouverture à la fois par joueur'),
    int('cooldown-seconds', 'Délai entre deux ouvertures (s)', { min: 0, max: 86400 }),
    select('full-inventory', 'Inventaire plein', [
      { value: 'drop', label: 'L’objet tombe au sol' },
      { value: 'deny', label: 'Ouverture refusée' },
    ]),
    bool('broadcast-enabled', 'Annoncer les lots rares'),
    bool('preview-show-chance', 'Afficher les pourcentages dans l’aperçu'),
    section('win-flourish', 'Mise en valeur du gain', [
      bool('title', 'Titre plein écran'),
      bool('sound', 'Son'),
      bool('firework', 'Feu d’artifice'),
      bool('firework-rare-only', 'Feu d’artifice seulement pour les lots annoncés'),
    ]),
    int('autosave-seconds', 'Sauvegarde automatique (s)', { min: 30, max: 3600 }),
    bool('floating-key', 'Clé 3D au-dessus des blocs'),
  ]),
  section('storage', 'Stockage', [
    select('type', 'Type', [
      { value: 'json', label: 'Fichiers JSON (un serveur)' },
      { value: 'mysql', label: 'MySQL (réseau)', premium: true },
    ]),
    section(
      'mysql',
      'MySQL',
      [...mysqlFields('username'), bool('useSSL', 'SSL'), text('table-prefix', 'Préfixe des tables', { pattern: '^[A-Za-z0-9_]{0,16}$' })],
      { showIf: { key: 'type', equals: 'mysql' } },
    ),
  ]),
  section('tagcustom', 'Liaison FondamentalTag', [
    bool('enabled', 'Activée'),
    bool('rarity-from-tag', 'Un lot de tag sans rareté prend celle du tag'),
  ]),
  section('animations', 'Animations', [
    select('default', 'Animation par défaut', [
      'roulette',
      'cascade',
      { value: 'wheel', label: 'wheel', premium: true },
      { value: 'spotlight', label: 'spotlight', premium: true },
      { value: 'flip', label: 'flip', premium: true },
      { value: 'spiral', label: 'spiral', premium: true },
      { value: 'firework', label: 'firework', premium: true },
      { value: 'tornado', label: 'tornado', premium: true },
    ]),
  ]),
  colorsSection(),
];

export const passConfig1_3: ConfigField[] = [
  licenseSection(),
  section('server', 'Serveur', [text('name', 'Nom unique de ce serveur sur le réseau', { pattern: '^[A-Za-z0-9_.-]{1,64}$' })]),
  section('storage', 'Stockage', [
    select('type', 'Type', [
      { value: 'sqlite', label: 'SQLite (un serveur)' },
      { value: 'mysql', label: 'MySQL (réseau)', premium: true },
    ]),
    text('table-prefix', 'Préfixe des tables', { pattern: '^[A-Za-z0-9_]{0,16}$' }),
    section('mysql', 'MySQL', [...mysqlFields('user'), int('pool-size', 'Connexions', { min: 1, max: 50 })], {
      showIf: { key: 'type', equals: 'mysql' },
    }),
    int('autosave-seconds', 'Sauvegarde automatique (s)', { min: 10, max: 3600 }),
    int('lock-wait-seconds', 'Attente du serveur précédent (s)', { min: 1, max: 120 }),
    int('lock-stale-seconds', 'Verrou abandonné après (s)', { min: 30, max: 3600 }),
  ]),
  text('timezone', 'Fuseau horaire', { placeholder: 'Europe/Paris', pattern: '^[A-Za-z_]+(/[A-Za-z_+-]+)*$' }),
  int('reset-hour', 'Heure du renouvellement quotidien', { min: 0, max: 23 }),
  bool('auto-claim', 'Récupérer automatiquement les récompenses'),
  bool('afk-excludes-playtime', 'L’inactivité ne compte pas dans le temps de jeu'),
  int('placeholder-interval-seconds', 'Relevé des objectifs placeholder (s)', { min: 5, max: 3600, premium: true }),
  section('notifications', 'Notifications', [
    bool('progress-actionbar', 'Barre d’action à chaque progression'),
    bool('explain-ignored', 'Expliquer une action qui n’a pas compté'),
    bool('join-reminder', 'Rappel des récompenses à la connexion'),
  ]),
  section('boosts', 'Boosts d’XP', [
    bool('permissions', 'Boosts par permission (fondamentalpass.boost.<pourcent>)'),
    int('max-percent', 'Plafond du boost total (%)', { min: 0, max: 1000 }),
  ]),
  section('streak', 'Série', [
    int('bonus-percent-per-day', 'Bonus par jour de série (%)', { min: 0, max: 100 }),
    int('max-bonus-percent', 'Bonus maximum (%)', { min: 0, max: 500 }),
  ]),
  section('tracking', 'Suivi de quête', [
    bool('enabled', 'Activé'),
    select('color', 'Couleur de la barre', ['PURPLE', 'PINK', 'BLUE', 'RED', 'GREEN', 'YELLOW', 'WHITE']),
  ]),
  section('rerolls', 'Changement de quête', [
    bool('enabled', 'Activé'),
    int('per-day', 'Changements gratuits par jour', { min: 0, max: 50 }),
    decimal('cost', 'Prix par changement', { min: 0 }),
    text('currency', 'Monnaie (vide = par défaut)'),
  ]),
  section('tier-purchase', 'Achat de paliers', [
    bool('enabled', 'Activé', { premium: true }),
    decimal('price', 'Prix d’un palier', { min: 0 }),
    text('currency', 'Monnaie (vide = par défaut)'),
  ]),
  section('hooks', 'Liaisons', [text('crate-key-command', 'Commande d’une récompense crate-key')]),
  colorsSection(),
  section('menus', 'Vitres des menus', [material('border', 'Cadre'), material('accent', 'Coins')]),
];
