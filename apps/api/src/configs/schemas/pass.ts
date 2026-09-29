import type { ConfigField } from '@fondamental/shared';
import { DURATION, ID, int, lines, list, map, material, mm, section, select, text, decimal } from './fields.js';

/** `season.yml` et `quests.yml` de FondamentalPass 1.3 (voir le wiki, « La saison » et « Les quêtes »). */

const DATE_TIME = '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$';

/** Récompenses communes : paliers, quêtes, bonus de pool, classement. */
export const passRewards = (key = 'rewards', label = 'Récompenses') =>
  list(key, label, {
    itemLabel: 'récompense',
    variants: {
      key: 'type',
      options: [
        { value: 'money', label: 'Argent (Vault)', fields: [decimal('amount', 'Montant', { min: 0 })] },
        {
          value: 'item',
          label: 'Objet',
          fields: [material('material', 'Objet'), int('amount', 'Quantité', { min: 1, max: 2304 }), mm('name', 'Nom'), lines('lore', 'Description', { minimessage: true })],
        },
        {
          value: 'command',
          label: 'Commande',
          fields: [
            text('command', 'Commande', { help: '{player} et {uuid} sont remplacés, sans « / ».', optional: false }),
            select('as', 'Exécutée par', [
              { value: 'console', label: 'La console' },
              { value: 'player', label: 'Le joueur' },
            ]),
          ],
        },
        { value: 'message', label: 'Message', fields: [mm('message', 'Message', { optional: false })] },
        {
          value: 'scroll',
          label: 'Parchemin',
          fields: [text('scroll', 'Parchemin (ou random)', { pattern: ID }), text('level', 'Niveau (avec random)', { pattern: ID }), int('amount', 'Quantité', { min: 1, max: 64 })],
        },
        {
          value: 'tag',
          label: 'Tag FondamentalTag',
          premium: true,
          fields: [text('tag', 'Identifiant du tag', { pattern: ID, optional: false }), text('duration', 'Durée (vide = à vie)', { pattern: DURATION })],
        },
        {
          value: 'crate-key',
          label: 'Clés FondamentalCrate',
          premium: true,
          fields: [text('crate', 'Crate', { pattern: ID, optional: false }), int('amount', 'Quantité', { min: 1, max: 2304 })],
        },
      ],
    },
  });

const track = [mm('name', 'Nom'), material('icon', 'Icône'), lines('lore', 'Description', { minimessage: true }), passRewards()];

export const passSeason1_3: ConfigField[] = [
  section('season', 'Saison', [
    text('id', 'Identifiant', { pattern: '^[A-Za-z0-9_.-]{1,64}$', help: 'Le changer démarre une nouvelle saison : tout le monde repart de zéro.' }),
    mm('name', 'Nom'),
    text('start', 'Début', { pattern: DATE_TIME, placeholder: '2026-10-01 00:00' }),
    text('end', 'Fin', { pattern: DATE_TIME, placeholder: '2026-12-31 23:59' }),
    int('xp-per-tier', 'XP par palier', { min: 1 }),
    int('max-level', 'Nombre de paliers', { min: 1, max: 1000, help: '30 au maximum en édition Free.' }),
    text('premium-permission', 'Permission de la piste premium'),
  ]),
  section('overflow', 'Paliers bonus', [int('xp', 'XP par palier bonus (0 = désactivé)', { min: 0 }), mm('name', 'Nom'), passRewards()]),
  map('ranking-rewards', 'Récompenses de classement', {
    itemLabel: 'tranche',
    keyPattern: '^[1-9][0-9]*(-[1-9][0-9]*)?$',
    keyHelp: 'Une place (« 1 ») ou une tranche (« 4-10 »).',
    fields: [passRewards()],
  }),
  map('tiers', 'Paliers', {
    itemLabel: 'palier',
    keyPattern: '^[1-9][0-9]{0,3}$',
    keyHelp: 'Numéro du palier.',
    maxItems: 1000,
    fields: [
      int('xp', 'XP pour ce palier (vide = XP par palier)', { min: 1 }),
      section('free', 'Piste gratuite', track),
      section('premium', 'Piste premium', track, { premium: true }),
    ],
  }),
];

const OBJECTIVES = [
  { value: 'break-block', label: 'Casser des blocs' },
  { value: 'place-block', label: 'Poser des blocs' },
  { value: 'kill-mob', label: 'Tuer des créatures' },
  { value: 'kill-player', label: 'Tuer des joueurs' },
  { value: 'craft', label: 'Fabriquer' },
  { value: 'fish', label: 'Pêcher' },
  { value: 'smelt', label: 'Faire cuire' },
  { value: 'enchant', label: 'Enchanter' },
  { value: 'consume', label: 'Consommer' },
  { value: 'breed', label: 'Faire se reproduire' },
  { value: 'playtime', label: 'Jouer (minutes)' },
  { value: 'walk', label: 'Marcher (blocs)' },
  { value: 'login', label: 'Se connecter (jours)' },
  { value: 'custom', label: 'Clé envoyée par un plugin', premium: true },
  { value: 'placeholder', label: 'Valeur d’un placeholder', premium: true },
];

export const passQuests1_3: ConfigField[] = [
  map('difficulties', 'Difficultés', {
    itemLabel: 'difficulté',
    keyPattern: ID,
    maxItems: 10,
    fields: [mm('name', 'Nom'), int('stars', 'Étoiles', { min: 0, max: 10 })],
  }),
  map('pools', 'Pools', {
    itemLabel: 'pool',
    keyPattern: ID,
    maxItems: 20,
    fields: [
      text('name', 'Nom'),
      material('icon', 'Icône'),
      select('reset', 'Renouvellement', [
        { value: 'daily', label: 'Chaque jour' },
        { value: 'weekly', label: 'Chaque lundi' },
        { value: 'season', label: 'Jamais (toute la saison)' },
      ]),
      {
        kind: 'oneOf',
        key: 'amount',
        label: 'Quêtes tirées',
        options: [
          { label: 'un nombre', field: int('amount', 'Nombre', { min: 1, max: 50 }) },
          { label: 'toutes', field: select('amount', 'Toutes', [{ value: 'all', label: 'Toutes' }]) },
          {
            label: 'par difficulté',
            field: map('amount', 'Par difficulté', { itemLabel: 'difficulté', keyPattern: ID, value: int('n', 'Nombre', { min: 0, max: 50 }) }),
          },
        ],
      },
      section('completion', 'Bonus quand tout est terminé', [int('xp', 'XP', { min: 0 }), passRewards()]),
    ],
  }),
  map('quests', 'Quêtes', {
    itemLabel: 'quête',
    keyPattern: ID,
    maxItems: 500,
    fields: [
      text('pool', 'Pool', { pattern: ID, optional: false }),
      text('difficulty', 'Difficulté', { pattern: ID }),
      text('name', 'Nom'),
      mm('description', 'Description', { help: '<amount> = quantité demandée.' }),
      material('icon', 'Icône'),
      int('xp', 'XP', { min: 0 }),
      int('weight', 'Poids (chance d’être tirée)', { min: 1 }),
      lines('servers', 'Serveurs', { pattern: '^[A-Za-z0-9_.*-]{1,64}$', help: 'Motifs avec *, ex. bedwars-*. Vide = tout le réseau.' }),
      text('where', 'Nom affiché pour ces serveurs'),
      passRewards(),
      section('objective', 'Objectif', [
        select('type', 'Type', OBJECTIVES),
        int('amount', 'Quantité', { min: 1 }),
        lines('materials', 'Blocs ou objets (filtre)', { pattern: '^[A-Z0-9_]+$' }),
        lines('entities', 'Créatures (filtre)', { pattern: '^[A-Z0-9_]+$' }),
        lines('items', 'Objets (filtre)', { pattern: '^[A-Z0-9_]+$' }),
        text('key', 'Clé (custom)', { showIf: { key: 'type', equals: 'custom' }, placeholder: 'bedwars:win' }),
        text('placeholder', 'Placeholder', { showIf: { key: 'type', equals: 'placeholder' }, placeholder: '%vault_eco_balance%' }),
        select('mode', 'Mode (placeholder)', [
          { value: 'increase', label: 'Gagner la quantité depuis le tirage' },
          { value: 'reach', label: 'Atteindre la valeur' },
        ], { showIf: { key: 'type', equals: 'placeholder' } }),
      ]),
    ],
  }),
];
