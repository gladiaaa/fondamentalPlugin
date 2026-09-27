import { parseMailLocale } from './locale.js';

describe('parseMailLocale', () => {
  it.each(['en', 'en-US', 'en-GB', 'EN', 'en;q=0.9'])('reconnaît %j comme anglais', (header) => {
    expect(parseMailLocale(header)).toBe('en');
  });

  it.each(['fr', 'fr-FR', 'de', 'es-ES', 'de,en;q=0.5'])('reconnaît %j comme français', (header) => {
    expect(parseMailLocale(header)).toBe('fr');
  });

  it("choisit le français par défaut, sans en-tête", () => {
    expect(parseMailLocale(undefined)).toBe('fr');
    expect(parseMailLocale('')).toBe('fr');
  });
});
