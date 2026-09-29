import type { ConfigField } from '@fondamental/shared';
import { bool, HEX, ID, int, lines, map, material, mm, section, select, text, decimal } from './fields.js';

/** `tags.yml` de FondamentalTag 2.1 : raretés, catégories et tags (voir le wiki, « Créer des tags »). */

const EFFECTS = ['solid', 'gradient', 'wave', 'rainbow', 'shine', 'pulse', 'flicker', 'fade', 'glitch', 'sparkle', 'fire', 'strobe'];
const STYLES = ['none', 'smallcaps', 'bold', 'sans', 'italic', 'script', 'fraktur', 'double', 'mono', 'fullwidth'];

const tag: ConfigField[] = [
  mm('display', 'Affichage (écrit à la main)', { help: 'En Free : couleurs unies, gras, italique, souligné, barré.' }),
  text('permission', 'Permission', { help: 'Vide = tag public. Absent = fondamentaltag.tag.<id>.' }),
  lines('description', 'Description', { minimessage: true }),
  material('icon', 'Icône'),
  int('numeric-id', 'Numéro (%fondamentaltag_id_N%)', { min: 0 }),
  // Tag généré par un effet (Premium).
  text('text', 'Texte (tag généré)', { premium: true }),
  select('effect', 'Effet', EFFECTS.map((e) => ({ value: e, label: e, premium: true }))),
  lines('colors', 'Couleurs', { pattern: HEX, maxItems: 10, premium: true }),
  select('style', 'Style de lettres', STYLES.map((s) => ({ value: s, label: s, premium: s !== 'none' }))),
  mm('format', 'Format ({text} = texte généré)', { premium: true }),
  bool('bold', 'Gras'),
  bool('italic', 'Italique'),
  text('font', 'Police', { premium: true }),
  text('shadow', 'Ombre colorée', { pattern: HEX, premium: true }),
  int('speed', 'Vitesse (ticks entre deux images)', { min: 1, max: 100, premium: true }),
  select('motion', 'Mouvement (pack de ressources)', ['none', 'bounce', 'shake', 'float', 'sway', 'jump'], { premium: true }),
  text('highlight', 'Couleur du reflet', { pattern: HEX, premium: true }),
  decimal('spread', 'Largeur de la vague', { min: 0, max: 10, step: 0.1, premium: true }),
  int('pause', 'Pause du reflet (ticks)', { min: 0, max: 400, premium: true }),
  // Animation écrite à la main (Premium).
  lines('frames', 'Images de l’animation', { minimessage: true, premium: true }),
  int('interval', 'Ticks entre deux images', { min: 1, max: 200, premium: true }),
  // Boutique, rareté, événement.
  int('price', 'Prix dans le menu', { min: 0, premium: true, help: '0 = gratuit. Absent = pas en vente.' }),
  text('rarity', 'Rareté', { pattern: ID }),
  section('event', 'Événement', [
    mm('name', 'Nom'),
    text('start', 'Début', { pattern: '^\\d{4}-\\d{2}-\\d{2}( \\d{2}:\\d{2})?$', placeholder: '2026-10-15' }),
    text('end', 'Fin', { pattern: '^\\d{4}-\\d{2}-\\d{2}( \\d{2}:\\d{2})?$', placeholder: '2026-11-05' }),
    select('after', 'Après l’événement', [
      { value: 'keep', label: 'Gardé par ceux qui l’ont' },
      { value: 'remove', label: 'Retiré à tous' },
    ]),
  ]),
];

export const tagTags2_1: ConfigField[] = [
  map('rarities', 'Raretés', {
    itemLabel: 'rareté',
    keyPattern: ID,
    maxItems: 20,
    fields: [mm('display', 'Nom'), int('order', 'Ordre (plus grand = plus rare)', { min: 0, max: 100 })],
  }),
  map('categories', 'Catégories', {
    itemLabel: 'catégorie',
    keyPattern: ID,
    maxItems: 50,
    fields: [
      mm('display', 'Nom'),
      material('icon', 'Icône'),
      lines('description', 'Description', { minimessage: true }),
      map('tags', 'Tags', { itemLabel: 'tag', keyPattern: ID, maxItems: 200, fields: tag }),
    ],
  }),
];
