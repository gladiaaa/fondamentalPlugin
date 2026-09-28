import { currentTotpCode, generateTotpSecret, totpUri, verifyTotp } from './totp.js';

describe('TOTP', () => {
  it('generateTotpSecret : base32, différent à chaque appel', () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(a).not.toBe(b);
  });

  it('totpUri : adresse otpauth:// valide, avec l’adresse du compte et le secret', () => {
    const uri = totpUri('ABCDEFGHIJKLMNOP', 'admin@example.com');
    expect(uri).toBe(
      'otpauth://totp/Fondamental%20Plugin%3Aadmin%40example.com?secret=ABCDEFGHIJKLMNOP&issuer=Fondamental%20Plugin&digits=6&period=30',
    );
  });

  it('verifyTotp : accepte le code courant', () => {
    const secret = generateTotpSecret();
    const now = new Date('2026-01-01T12:00:00Z');
    const code = currentTotpCode(secret, now);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, now)).toBe(true);
  });

  it('verifyTotp : accepte le code de l’étape précédente ou suivante (dérive d’horloge)', () => {
    const secret = generateTotpSecret();
    const now = new Date('2026-01-01T12:00:00Z');
    const before = new Date(now.getTime() - 30_000);
    const after = new Date(now.getTime() + 30_000);
    expect(verifyTotp(secret, currentTotpCode(secret, before), now)).toBe(true);
    expect(verifyTotp(secret, currentTotpCode(secret, after), now)).toBe(true);
  });

  it('verifyTotp : refuse un code trop ancien (deux étapes ou plus)', () => {
    const secret = generateTotpSecret();
    const now = new Date('2026-01-01T12:00:00Z');
    const tooOld = new Date(now.getTime() - 90_000);
    expect(verifyTotp(secret, currentTotpCode(secret, tooOld), now)).toBe(false);
  });

  it('verifyTotp : refuse un code faux', () => {
    const secret = generateTotpSecret();
    const now = new Date('2026-01-01T12:00:00Z');
    const code = currentTotpCode(secret, now);
    const wrong = code === '000000' ? '111111' : '000000';
    expect(verifyTotp(secret, wrong, now)).toBe(false);
  });

  it('verifyTotp : refuse un code mal formé (pas 6 chiffres)', () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, '12345')).toBe(false);
    expect(verifyTotp(secret, 'abcdef')).toBe(false);
    expect(verifyTotp(secret, '')).toBe(false);
  });

  it('verifyTotp : ignore les espaces dans le code tapé', () => {
    const secret = generateTotpSecret();
    const now = new Date('2026-01-01T12:00:00Z');
    const code = currentTotpCode(secret, now);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotp(secret, spaced, now)).toBe(true);
  });

  it('deux secrets différents ne valident pas le même code', () => {
    const secretA = generateTotpSecret();
    const secretB = generateTotpSecret();
    const now = new Date('2026-01-01T12:00:00Z');
    const codeA = currentTotpCode(secretA, now);
    expect(verifyTotp(secretB, codeA, now)).toBe(false);
  });
});
