import { extractDefaults, walkValues } from '../config-engine.js';
import { shopCategory1_1 } from './shop.js';

/** Une catégorie qui utilise les champs que le fichier livré n'a pas (types, limites, vitrine…). */
const CATEGORY = `
display: "<accent>Mélange"
icon: CHEST
rows: 4
permission: ""
rotation: { count: 3, period: day }
items:
  pioche:
    material: DIAMOND_PICKAXE
    buy: 2500
    item-name: "<accent>Pioche du mineur"
    item-lore: ["<texte>Vendue par la boutique"]
    enchantments: { efficiency: 4, unbreaking: 3 }
    quantity: false
    cooldown: 1d
  diamant:
    material: DIAMOND
    buy: 400
    sell: 100
    match: exact
    limit: { amount: 16, period: day }
    stock: { amount: 100, period: week }
    sale: { percent: 20, until: "2026-10-31 23:59" }
    currency: emeraudes
  rubis:
    material: itemsadder:ruby
    buy: 50
  cle:
    type: crate-key
    crate: mythic
    buy: 10000
    max-quantity: 4
  vip:
    type: rank
    group: vip
    duration: 30d
    buy: 50000
    confirm: true
  annonce:
    type: command
    commands: ["broadcast {player} offre une tournée"]
    buy: 1000
  grades:
    type: info
    slot: 13
    icon: EMERALD
    name: "<green>VIP"
    lore: ["<texte>Bonus de revente +10 %"]
    link: "https://fondamentalplugin.fr"
`;

describe('schéma des catégories de FondamentalShop', () => {
  it('accepte une catégorie complète', () => {
    const { values, errors } = extractDefaults(shopCategory1_1, CATEGORY);
    expect(errors).toEqual([]);
    expect(walkValues(shopCategory1_1, values, 'strict').errors).toEqual([]);
    expect(Object.keys(values.items as object)).toHaveLength(7);
  });

  it('refuse une matière invalide', () => {
    const { errors } = extractDefaults(shopCategory1_1, 'items:\n  x:\n    material: "pas une matière"\n    buy: 1\n');
    expect(errors).not.toEqual([]);
  });
});
