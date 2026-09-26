import { MINECRAFT_VERSION, minecraftSortOrder } from './minecraft-version.js';

describe('minecraftSortOrder', () => {
  it('range les versions de la plus ancienne à la plus récente', () => {
    const versions = ['1.21.11', '1.8.8', '1.21', '1.22', '1.21.4', '1.9', '1.12.2', '1.21.10'];
    expect([...versions].sort((a, b) => minecraftSortOrder(a) - minecraftSortOrder(b))).toEqual([
      '1.8.8',
      '1.9',
      '1.12.2',
      '1.21',
      '1.21.4',
      '1.21.10',
      '1.21.11',
      '1.22',
    ]);
  });

  it('donne des valeurs fixes', () => {
    expect(minecraftSortOrder('1.21.4')).toBe(12104);
    expect(minecraftSortOrder('1.22')).toBe(12200);
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
