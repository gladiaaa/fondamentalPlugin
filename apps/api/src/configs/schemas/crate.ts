import type { ConfigField } from '@fondamental/shared';
import { bool, decimal, DURATION, grouped, ID, int, lines, list, map, material, mm, section, select, text, MATERIAL } from './fields.js';

/** `crates.yml` de FondamentalCrate 1.2 : raretés et crates (voir le wiki, « Créer des crates »). */

const ANIMATIONS = [
  'roulette',
  'cascade',
  { value: 'wheel', label: 'wheel', premium: true },
  { value: 'spotlight', label: 'spotlight', premium: true },
  { value: 'flip', label: 'flip', premium: true },
  { value: 'spiral', label: 'spiral (3D)', premium: true },
  { value: 'firework', label: 'firework (3D)', premium: true },
  { value: 'tornado', label: 'tornado (3D)', premium: true },
  { value: 'quad', label: 'quad : chambre au trésor (3D)', premium: true },
];

const CUSTOM_ITEM = '^(itemsadder|oraxen|nexo):[A-Za-z0-9_:./-]+$';

/** Apparence d'un lot dans l'aperçu et l'animation. */
const displayFields: ConfigField[] = [
  material('material', 'Objet'),
  text('custom-item', 'Objet personnalisé', { pattern: CUSTOM_ITEM, placeholder: 'itemsadder:ruby' }),
  int('amount', 'Quantité affichée', { min: 1, max: 64 }),
  mm('name', 'Nom', { help: '<chance>, <rarity>, <tag> sont remplacés.' }),
  lines('lore', 'Description', { minimessage: true }),
];

/** Ce que le joueur reçoit : liste d'actions cumulables. */
const actions = list('actions', 'Actions', {
  itemLabel: 'action',
  variants: {
    key: 'type',
    options: [
      {
        value: 'item',
        label: 'Objet',
        fields: [
          material('material', 'Objet'),
          text('custom-item', 'Objet personnalisé', { pattern: CUSTOM_ITEM }),
          int('amount', 'Quantité', { min: 1, max: 2304 }),
          mm('name', 'Nom'),
          lines('lore', 'Description', { minimessage: true }),
          map('enchants', 'Enchantements', {
            itemLabel: 'enchantement',
            keyPattern: MATERIAL,
            keyHelp: 'Nom de l’enchantement, ex. SHARPNESS.',
            value: int('level', 'Niveau', { min: 1, max: 255 }),
          }),
          bool('glow', 'Brillant'),
          int('custom-model-data', 'Custom model data', { min: 0 }),
        ],
      },
      {
        value: 'command',
        label: 'Commande',
        fields: [
          text('command', 'Commande', { help: '%player% = le joueur, sans « / ».', optional: false }),
          select('as', 'Exécutée par', [
            { value: 'console', label: 'La console' },
            { value: 'player', label: 'Le joueur' },
          ]),
        ],
      },
      { value: 'message', label: 'Message', fields: [mm('message', 'Message', { optional: false })] },
      {
        value: 'tag',
        label: 'Tag FondamentalTag',
        fields: [
          text('tag', 'Identifiant du tag', { pattern: ID, optional: false }),
          text('duration', 'Durée (vide = à vie)', { pattern: DURATION, placeholder: '7d' }),
        ],
      },
      {
        value: 'cosmetic',
        label: 'Cosmétique FondamentalBedwars',
        fields: [
          text('permission', 'Permission du cosmétique', { placeholder: 'fbw.cosmetic.kill.lightning', optional: false }),
          int('coins', 'Coins si déjà possédé', { min: 0 }),
          mm('display', 'Nom affiché'),
        ],
      },
    ],
  },
});

const reward = [
  int('weight', 'Poids', { min: 1, max: 1_000_000, help: 'Chance = poids ÷ somme des poids.' }),
  text('rarity', 'Rareté', { pattern: ID, help: 'Une rareté de la section « Raretés ». Vide : common (ou celle du tag).' }),
  bool('broadcast', 'Annonce serveur'),
  text('permission', 'Permission requise'),
  bool('permission-negated', 'Réservé à ceux qui n’ont PAS la permission'),
  section('limit', 'Limites de gain (0 = illimité)', [int('global', 'Tous joueurs', { min: 0 }), int('per-player', 'Par joueur', { min: 0 })], {
    premium: true,
  }),
  section('display', 'Apparence', displayFields),
  actions,
];

const crate: ConfigField[] = [
  ...grouped('Général', [
    mm('display', 'Nom'),
    select('animation', 'Animation', ANIMATIONS),
    material('block', 'Bloc'),
    int('cooldown', 'Délai entre deux ouvertures (s, -1 = global)', { min: -1 }),
    text('permission', 'Permission pour ouvrir'),
    decimal('cost', 'Prix d’ouverture (Vault)', { min: 0 }),
    int('max-bulk', 'Clés ouvrables d’un coup', { min: 1, max: 54 }),
    int('rewards-per-open', 'Lots par ouverture', { min: 1, max: 9 }),
  ]),
  ...grouped('Récompenses', [
    map('rewards', 'Récompenses', { itemLabel: 'lot', keyPattern: ID, maxItems: 100, fields: reward }),
  ]),
  ...grouped('Apparence', [
    material('floating-item', 'Objet flottant', { premium: true }),
    text('ambient-particle', 'Particule d’ambiance', { pattern: MATERIAL, premium: true, placeholder: 'FLAME' }),
    select('ambient-effect', 'Forme des particules', ['puff', 'halo', 'helix', 'vortex', 'fountain', 'spiral'], { premium: true }),
    lines('quad-themes', 'Thèmes de la chambre au trésor', { pattern: '^(classic|nether|ocean|soul|end|forest)$' }),
    section('hologram', 'Hologramme', [
      bool('enabled', 'Activé'),
      decimal('offset', 'Hauteur', { min: -5, max: 10, step: 0.1 }),
      lines('lines', 'Lignes', { minimessage: true, help: '<winners> = derniers gagnants.' }),
    ]),
    section('key', 'Clé', [
      material('material', 'Objet'),
      mm('name', 'Nom'),
      lines('lore', 'Description', { minimessage: true }),
      bool('glow', 'Brillante'),
      int('custom-model-data', 'Custom model data', { min: 0 }),
    ]),
    section('preview', 'Aperçu', [mm('title', 'Titre'), int('rows', 'Lignes', { min: 1, max: 6 })]),
  ]),
  ...grouped('Mécaniques Premium', [
    int('keys-required', 'Clés consommées par ouverture', { min: 1, max: 64, premium: true }),
    bool('selection', 'Mode « au choix »', { premium: true }),
    section('pity', 'Pitié', [int('threshold', 'Seuil (ouvertures)', { min: 1 }), text('rarity', 'Rareté garantie', { pattern: ID })], {
      premium: true,
    }),
    map('milestones', 'Paliers d’ouverture', {
      premium: true,
      itemLabel: 'palier',
      keyPattern: '^[1-9][0-9]{0,5}$',
      keyHelp: 'Nombre d’ouvertures, ex. 25.',
      fields: [bool('repeat', 'À chaque multiple'), section('display', 'Apparence', displayFields), actions],
    }),
    bool('double-or-nothing', 'Quitte ou double', { premium: true }),
    decimal('double-or-nothing-chance', 'Chance de doubler', { min: 0.05, max: 0.95, step: 0.05 }),
    int('double-or-nothing-max', 'Multiplicateur maximum', { min: 2, max: 4096 }),
  ]),
];

export const crateCrates1_2: ConfigField[] = [
  map('rarities', 'Raretés', {
    itemLabel: 'rareté',
    keyPattern: ID,
    maxItems: 20,
    fields: [
      mm('display', 'Nom'),
      material('color', 'Vitre des animations'),
      text('firework', 'Couleur des feux', { pattern: '^#[0-9A-Fa-f]{6}$' }),
      bool('broadcast', 'Annonce serveur'),
    ],
  }),
  map('crates', 'Crates', { itemLabel: 'crate', keyPattern: ID, maxItems: 50, fields: crate }),
];
