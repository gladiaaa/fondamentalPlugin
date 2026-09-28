import { createHmac, randomBytes } from 'node:crypto';

/**
 * TOTP (RFC 6238) fait maison : HMAC-SHA1 sur `node:crypto`, sans dépendance externe. Secret en
 * base32 (norme des applications d'authentification : Google Authenticator, Aegis…).
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(bytes: Buffer): string {
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    output += BASE32_ALPHABET[Number.parseInt(bits.slice(i, i + 5), 2)];
  }
  return output;
}

function base32Decode(secret: string): Buffer {
  const cleaned = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** Secret aléatoire de 160 bits (recommandation RFC 4226), prêt à afficher ou encoder en QR code. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** Adresse `otpauth://` standard, à afficher en QR code (Google Authenticator, Aegis, 1Password…). */
export function totpUri(secret: string, accountEmail: string, issuer = 'Fondamental Plugin'): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const b0 = hmac[offset] ?? 0;
  const b1 = hmac[offset + 1] ?? 0;
  const b2 = hmac[offset + 2] ?? 0;
  const b3 = hmac[offset + 3] ?? 0;
  const binary = ((b0 & 0x7f) << 24) | (b1 << 16) | (b2 << 8) | b3;
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/** Code valide à l'instant donné. Sert aux tests ; une vraie application d'authentification fait ce calcul elle-même. */
export function currentTotpCode(secret: string, at: Date = new Date()): string {
  return hotp(secret, Math.floor(at.getTime() / 1000 / STEP_SECONDS));
}

/**
 * Vérifie un code à 6 chiffres, avec une tolérance d'une étape avant/après (dérive d'horloge usuelle).
 * `code` : chaîne telle que tapée par l'utilisateur (espaces retirés).
 */
export function verifyTotp(secret: string, code: string, at: Date = new Date()): boolean {
  const cleaned = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;
  const counter = Math.floor(at.getTime() / 1000 / STEP_SECONDS);
  for (const drift of [0, -1, 1]) {
    if (hotp(secret, counter + drift) === cleaned) return true;
  }
  return false;
}
