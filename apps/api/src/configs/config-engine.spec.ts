import { parseDocument } from 'yaml';
import type { ConfigField } from '@fondamental/shared';
import { extractDefaults, renderConfig, walkValues } from './config-engine.js';
import { bool, int, lines, list, map, section, select, text } from './schemas/fields.js';

const TEMPLATE = `# Fichier du plugin
license:
  key: "" # clé fournie à l'achat
  grace-hours: 72
server:
  name: "serveur" # nom unique
  extra: garde-moi # hors schéma : jamais touché
materials: [STONE, DIRT]
crates:
  vote:
    weight: 10
    rewards:
      - {type: item, amount: 2}
`;

const FIELDS: ConfigField[] = [
  section('license', 'Licence', [{ kind: 'license', key: 'key', label: 'Clé' }, int('grace-hours', 'Tolérance', { min: 0, max: 720 })]),
  section('server', 'Serveur', [text('name', 'Nom', { pattern: '^[a-z0-9-]+$' })]),
  lines('materials', 'Matériaux', { pattern: '^[A-Z_]+$' }),
  map('crates', 'Crates', {
    itemLabel: 'crate',
    keyPattern: '^[a-z]+$',
    fields: [
      int('weight', 'Poids', { min: 1 }),
      list('rewards', 'Récompenses', {
        itemLabel: 'récompense',
        variants: {
          key: 'type',
          options: [
            { value: 'item', label: 'Objet', fields: [int('amount', 'Quantité', { min: 1 })] },
            { value: 'message', label: 'Message', fields: [text('message', 'Message')] },
          ],
        },
      }),
    ],
  }),
  {
    kind: 'oneOf',
    key: 'amount',
    label: 'Quantité',
    options: [
      { label: 'un nombre', field: int('amount', 'Nombre', { min: 1 }) },
      { label: 'toutes', field: select('amount', 'Toutes', ['all']) },
    ],
  },
  bool('enabled', 'Activé'),
];

const parse = (yaml: string) => parseDocument(yaml).toJS();

describe('moteur du générateur de configuration', () => {
  describe('rendu', () => {
    it('remplit la clé de licence, même sans valeur pour sa section', () => {
      const out = renderConfig(FIELDS, TEMPLATE, {}, 'FTAG-1234', 'Généré');
      expect(parse(out).license.key).toBe('FTAG-1234');
    });

    it('sans clé (aperçu d’un non-acheteur), laisse la valeur livrée', () => {
      const out = renderConfig(FIELDS, TEMPLATE, {}, null, 'Généré');
      expect(parse(out).license.key).toBe('');
    });

    it('change seulement les valeurs demandées et garde commentaires et champs hors schéma', () => {
      const out = renderConfig(FIELDS, TEMPLATE, { server: { name: 'lobby' } }, 'K', 'Généré le 29/09/2026');
      expect(out.startsWith('# Généré le 29/09/2026')).toBe(true);
      expect(out).toContain('# Fichier du plugin');
      expect(out).toContain('name: "lobby" # nom unique');
      expect(out).toContain('extra: garde-moi # hors schéma');
      expect(parse(out).license['grace-hours']).toBe(72);
    });

    it('remplace une entrée nommée entière et garde le style en ligne d’une liste de textes', () => {
      const values = {
        materials: ['STONE', 'SAND'],
        crates: { legendaire: { weight: 3, rewards: [{ type: 'message', message: 'Bravo' }] } },
      };
      const out = renderConfig(FIELDS, TEMPLATE, values, 'K', 'x');
      expect(out).toContain('materials: [ STONE, SAND ]');
      expect(parse(out).crates).toEqual(values.crates);
    });

    it('une valeur identique à celle livrée ne touche pas au fichier', () => {
      const same = renderConfig(FIELDS, TEMPLATE, { server: { name: 'serveur' } }, null, 'x');
      expect(same).toContain('name: "serveur" # nom unique');
    });
  });

  describe('validation stricte (valeurs du site)', () => {
    const check = (values: unknown) => walkValues(FIELDS, values, 'strict');

    it('accepte des valeurs correctes', () => {
      const r = check({ server: { name: 'bedwars-1' }, crates: { vote: { weight: 5, rewards: [{ type: 'item', amount: 3 }] } }, amount: 'all' });
      expect(r.errors).toEqual([]);
      expect(r.values.amount).toBe('all');
    });

    it.each([
      ['un champ inconnu', { pirate: 1 }, 'pirate'],
      ['un format invalide', { server: { name: 'Nom Avec Espaces' } }, 'server.name'],
      ['un nombre hors limites', { license: { 'grace-hours': 9999 } }, 'license.grace-hours'],
      ['un texte à la place d’un nombre', { crates: { vote: { weight: '5' } } }, 'crates.vote.weight'],
      ['un nom d’entrée invalide', { crates: { 'Vote!': { weight: 1 } } }, 'crates'],
      ['un type de récompense inconnu', { crates: { vote: { rewards: [{ type: 'bombe' }] } } }, 'crates.vote.rewards[0].type'],
      ['un champ d’une autre variante', { crates: { vote: { rewards: [{ type: 'item', message: 'x' }] } } }, 'crates.vote.rewards[0].message'],
      ['une forme non prévue', { amount: 'beaucoup' }, 'amount'],
      ['un élément de liste invalide', { materials: ['stone'] }, 'materials'],
    ])('refuse %s', (_, values, path) => {
      const r = check(values);
      expect(r.errors.map((e) => e.path)).toContain(path);
    });

    it('ignore toute clé de licence envoyée par le site (toujours remplie par l’API)', () => {
      const r = check({ license: { key: 'CLÉ-VOLÉE' } });
      expect(r.errors).toEqual([]);
      expect(r.values.license).toEqual({});
    });

    it('limite la taille d’une liste', () => {
      const r = walkValues([lines('l', 'L', { maxItems: 2 })], { l: ['a', 'b', 'c'] }, 'strict');
      expect(r.errors[0]?.path).toBe('l');
    });
  });

  it('lecture du fichier livré : les nombres écrits en texte sont convertis', () => {
    const { values, errors } = extractDefaults([text('port', 'Port')], 'port: 3306\n');
    expect(errors).toEqual([]);
    expect(values.port).toBe('3306');
  });
});
