import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Jeton aléatoire de 256 bits, utilisable dans une URL ou un cookie. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Empreinte stockée à la place du jeton : une fuite de la base ne donne pas de jeton utilisable.
 * SHA-256 suffit (jeton à forte entropie) et permet la recherche directe par empreinte.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Comparaison en temps constant. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
