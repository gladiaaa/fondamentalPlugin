import type { ConfigField } from '@fondamental/shared';
import {
  bool,
  colorsSection,
  decimal,
  DURATION,
  grouped,
  ID,
  int,
  licenseSection,
  lines,
  map,
  material,
  mm,
  mysqlFields,
  section,
  select,
  text,
} from './fields.js';

/** FondamentalShop 1.1 : `config.yml` et une catégorie de boutique `shops/<nom>.yml` (voir le README du plugin). */

const PERIODS = [
  { value: 'day', label: 'Par jour' },
  { value: 'week', label: 'Par semaine' },
  { value: 'month', label: 'Par mois' },
  { value: 'total', label: 'Au total' },
];

/** Matière Minecraft ou objet d'ItemsAdder, Oraxen, Nexo. */
const ITEM = '^([A-Z0-9_]+|(itemsadder|ia|oraxen|nexo):[A-Za-z0-9_:./-]+)$';
const DATE_TIME = '^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$';

export const shopConfig1_1: ConfigField[] = [
  licenseSection(),
  select('language', 'Langue', [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
  ]),
  text('timezone', 'Fuseau horaire', { placeholder: 'Europe/Paris', help: 'Changement de jour des limites « par jour ».' }),
  section('server', 'Serveur', [text('name', 'Nom de ce serveur', { help: 'Noté dans le journal des achats (lobby, survie…).' })]),
  section('storage', 'Stockage', [
    select('type', 'Type', [
      { value: 'sqlite', label: 'SQLite (un serveur)' },
      { value: 'mysql', label: 'MySQL (limites et stock partagés par le réseau)', premium: true },
    ]),
    text('table-prefix', 'Préfixe des tables', { pattern: '^[A-Za-z0-9_]{0,16}$' }),
    section('mysql', 'MySQL', [...mysqlFields('user'), int('pool-size', 'Connexions', { min: 2, max: 20 })], {
      showIf: { key: 'type', equals: 'mysql' },
    }),
  ]),
  section('log', 'Journal', [int('retention-days', 'Durée de conservation (jours, 0 = toujours)', { min: 0, max: 3650 })]),
  map('commands', 'Commandes de boutique', {
    itemLabel: 'commande',
    keyPattern: '^[a-z0-9_-]{1,32}$',
    keyHelp: 'Nom de la commande sans « / », ex. boutique.',
    maxItems: 20,
    help: 'Chaque commande ouvre un menu avec ses catégories. Une seule catégorie : elle s’ouvre directement.',
    fields: [
      mm('title', 'Titre du menu', { help: 'Vide = titre par défaut.' }),
      int('rows', 'Lignes du menu', { min: 3, max: 6 }),
      text('permission', 'Permission', { help: 'Vide = tout le monde.' }),
      text('description', 'Description'),
      lines('aliases', 'Alias', { pattern: '^[a-z0-9_-]{1,32}$', maxItems: 10 }),
      lines('categories', 'Catégories', { pattern: ID, help: 'Noms des fichiers de shops/ (sans .yml). Vide = toutes.' }),
    ],
  }),
  section('currencies', 'Monnaies', [
    text('vault-format', 'Affichage des montants Vault', { help: '<amount> = le montant. Vide = format de l’économie.' }),
    map('list', 'Autres monnaies', {
      premium: true,
      itemLabel: 'monnaie',
      keyPattern: ID,
      fields: [
        select('type', 'Type', [
          { value: 'item', label: 'Objet de l’inventaire' },
          { value: 'xp-levels', label: 'Niveaux d’expérience' },
          { value: 'placeholder', label: 'Autre plugin (PlaceholderAPI)' },
        ]),
        material('material', 'Objet', { showIf: { key: 'type', equals: 'item' } }),
        mm('name', 'Nom exact exigé', { showIf: { key: 'type', equals: 'item' } }),
        text('balance', 'Placeholder du solde', { placeholder: '%playerpoints_points%', showIf: { key: 'type', equals: 'placeholder' } }),
        text('take', 'Commande de retrait', { help: '{player}, {uuid}, {amount}.', showIf: { key: 'type', equals: 'placeholder' } }),
        text('give', 'Commande de dépôt (revente)', { showIf: { key: 'type', equals: 'placeholder' } }),
        text('format', 'Affichage', { help: '<amount> = le montant.' }),
      ],
    }),
  ]),
  section('buy', 'Achat', [
    decimal('confirm-above', 'Confirmation à partir de (prix total, -1 = jamais)', { min: -1 }),
    select('inventory-full', 'Inventaire plein', [
      { value: 'deny', label: 'Achat refusé' },
      { value: 'drop', label: 'Objets jetés au sol' },
    ]),
  ]),
  section('grants', 'Livraison (commandes console)', [
    text('permission', 'Permission définitive', { help: '{player}, {node}.' }),
    text('permission-temp', 'Permission temporaire', { help: '{player}, {node}, {seconds}.' }),
    text('rank', 'Grade définitif', { help: '{player}, {group}.' }),
    text('rank-temp', 'Grade temporaire', { help: '{player}, {group}, {seconds}.' }),
    text('crate-key', 'Clés de caisses', { help: '{player}, {crate}, {amount}.' }),
  ]),
  section('sell', 'Revente', [
    map('bonus', 'Bonus par grade (%)', {
      itemLabel: 'bonus',
      keyPattern: ID,
      keyHelp: 'Permission fondamentalshop.sell.bonus.<nom>.',
      value: int('percent', 'Bonus (%)', { min: 0, max: 1000 }),
    }),
  ]),
  section('menus', 'Menus', [material('border', 'Bordure'), material('accent', 'Coins')]),
  section('sounds', 'Sons (identifiants Minecraft, vide = aucun)', [
    text('click', 'Clic'),
    text('buy', 'Achat'),
    text('sell', 'Revente'),
    text('error', 'Erreur'),
  ]),
  colorsSection(),
];

/** Un article : les champs propres à un type ne s'affichent que pour ce type. */
const article: ConfigField[] = [
  ...grouped('Article', [
    select('type', 'Type', [
      { value: 'item', label: 'Objet' },
      { value: 'crate-key', label: 'Clé de caisse (FondamentalCrate)' },
      { value: 'rank', label: 'Grade (LuckPerms)' },
      { value: 'permission', label: 'Permission' },
      { value: 'tag', label: 'Tag (FondamentalTag)' },
      { value: 'command', label: 'Commandes' },
      { value: 'info', label: 'Vitrine (avantages et lien)' },
    ]),
    mm('name', 'Nom'),
    lines('lore', 'Description', { minimessage: true }),
    material('icon', 'Icône', { help: 'Vide = l’objet vendu.' }),
    int('slot', 'Case', { min: 0, max: 53, help: 'Vide = placé automatiquement.' }),
  ]),
  ...grouped('Ce qui est livré', [
    text('material', 'Objet', { pattern: ITEM, placeholder: 'DIAMOND', help: 'Ou itemsadder:id, oraxen:id, nexo:id.' }),
    int('amount', 'Quantité par unité', { min: 1, max: 2304 }),
    mm('item-name', 'Nom de l’objet livré'),
    lines('item-lore', 'Description de l’objet livré', { minimessage: true }),
    int('custom-model-data', 'Custom model data', { min: 0 }),
    map('enchantments', 'Enchantements', {
      itemLabel: 'enchantement',
      keyPattern: '^[a-z_]+$',
      keyHelp: 'Nom Minecraft, ex. efficiency.',
      value: int('level', 'Niveau', { min: 1, max: 255 }),
    }),
    text('crate', 'Caisse', { pattern: ID, showIf: { key: 'type', equals: 'crate-key' } }),
    text('group', 'Groupe LuckPerms', { showIf: { key: 'type', equals: 'rank' } }),
    text('node', 'Permission donnée', { showIf: { key: 'type', equals: 'permission' } }),
    text('tag', 'Identifiant du tag', { pattern: ID, showIf: { key: 'type', equals: 'tag' } }),
    lines('commands', 'Commandes console', { help: '{player}, {uuid}, {amount}, sans « / ».', showIf: { key: 'type', equals: 'command' } }),
    text('duration', 'Durée (vide = définitif)', { pattern: DURATION, placeholder: '30d', help: 'Grades, permissions, tags.' }),
    text('link', 'Lien', { placeholder: 'https://…', showIf: { key: 'type', equals: 'info' } }),
  ]),
  ...grouped('Prix', [
    decimal('buy', 'Prix d’achat', { min: 0, help: 'Vide = pas à vendre.' }),
    decimal('sell', 'Prix de revente', { min: 0, help: 'Objets seulement. Vide = ne se revend pas.' }),
    select('match', 'Revente acceptée', [
      { value: 'material', label: 'N’importe quel objet de cette matière (non renommé)' },
      { value: 'exact', label: 'Exactement l’objet livré' },
    ]),
    text('currency', 'Monnaie', { pattern: ID, premium: true, help: 'Une monnaie de config.yml. Vide = Vault.' }),
  ]),
  ...grouped('Règles', [
    bool('quantity', 'Choix de la quantité'),
    int('max-quantity', 'Quantité maximale par achat', { min: 1, max: 2304 }),
    text('permission', 'Permission pour acheter'),
    section('limit', 'Limite par joueur', [int('amount', 'Achats', { min: 1 }), select('period', 'Période', PERIODS)]),
    text('cooldown', 'Délai entre deux achats', { pattern: DURATION, placeholder: '1d' }),
    bool('confirm', 'Écran de confirmation'),
  ]),
  ...grouped('Premium', [
    section('stock', 'Stock commun', [int('amount', 'Unités', { min: 1 }), select('period', 'Remis à neuf', PERIODS)], { premium: true }),
    section('sale', 'Promotion', [int('percent', 'Réduction (%)', { min: 1, max: 100 }), text('until', 'Jusqu’au', { pattern: DATE_TIME, placeholder: '2026-10-31 23:59' })], {
      premium: true,
    }),
  ]),
];

export const shopCategory1_1: ConfigField[] = [
  bool('enabled', 'Activée'),
  mm('display', 'Nom dans le menu'),
  material('icon', 'Icône'),
  lines('lore', 'Description', { minimessage: true }),
  int('slot', 'Case dans le menu de la commande', { min: 0, max: 53 }),
  int('rows', 'Lignes du menu', { min: 3, max: 6 }),
  text('permission', 'Permission pour voir la catégorie', { help: 'Vide = tout le monde.' }),
  section('rotation', 'Boutique du moment', [int('count', 'Articles tirés au sort', { min: 1 }), select('period', 'Renouvelés', PERIODS.slice(0, 3))], {
    premium: true,
  }),
  map('items', 'Articles', { itemLabel: 'article', keyPattern: ID, maxItems: 200, fields: article }),
];
