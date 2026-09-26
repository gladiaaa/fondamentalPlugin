import { generateToken, hashToken, safeEqual } from './tokens.js';

describe('tokens', () => {
  it('génère des jetons de 256 bits, utilisables dans une URL, tous différents', () => {
    const tokens = new Set(Array.from({ length: 200 }, generateToken));
    expect(tokens.size).toBe(200);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("l'empreinte est stable, distincte du jeton, et ne le révèle pas", () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(generateToken())).not.toBe(hashToken(token));
  });

  it('compare en temps constant, y compris des longueurs différentes', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', '')).toBe(true);
  });
});
