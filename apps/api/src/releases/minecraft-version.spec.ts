import { MINECRAFT_VERSION, minecraftSortOrder } from './minecraft-version.js';

describe('minecraftSortOrder', () => {
  it('range les versions de la plus ancienne à la plus récente', () => {
    const versions = ['26.1', '1.21.11', '1.8.8', '1.21', '26.1.2', '1.21.4', '1.9', '1.12.2', '1.21.10', '26.2'];
    expect([...versions].sort((a, b) => minecraftSortOrder(a) - minecraftSortOrder(b))).toEqual([
      '1.8.8',
      '1.9',
      '1.12.2',
      '1.21',
      '1.21.4',
      '1.21.10',
      '1.21.11',
      '26.1',
      '26.1.2',
      '26.2',
    ]);
  });

  it('donne des valeurs fixes', () => {
    expect(minecraftSortOrder('1.21.4')).toBe(12104);
    expect(minecraftSortOrder('26.1')).toBe(260100);
    expect(minecraftSortOrder('26.1.2')).toBe(260102);
  });

  it("range toute version future après les précédentes, sans qu'il faille éditer le code", () => {
    // Mojang est passé de 1.21.11 à 26.1 : une nouvelle numérotation ne casse rien.
    const futures = ['26.1', '26.4.3', '27.1', '27.12.10', '31.2', '99.99.99'];
    let previous = minecraftSortOrder('1.21.11');
    for (const version of futures) {
      const rank = minecraftSortOrder(version);
      expect(rank).toBeGreaterThan(previous);
      previous = rank;
    }
  });

  it('refuse une version mal formée', () => {
    expect(() => minecraftSortOrder('abc')).toThrow();
    expect(() => minecraftSortOrder('1.21.4-pre1')).toThrow();
  });
});

describe('MINECRAFT_VERSION', () => {
  it.each(['1.21', '1.21.4', '1.8.8', '26.1.2'])('accepte %s', (version) => {
    expect(MINECRAFT_VERSION.test(version)).toBe(true);
  });

  it.each(['1', '1.21.4.1', '../1.21', '1.21.4;', ' 1.21', '1.21.', '1..21', '1.211.4'])('refuse %j', (version) => {
    expect(MINECRAFT_VERSION.test(version)).toBe(false);
  });
});
