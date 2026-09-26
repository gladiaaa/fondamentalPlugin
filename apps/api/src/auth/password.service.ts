import { Injectable, OnModuleInit } from '@nestjs/common';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

// Paramètres recommandés par l'OWASP pour argon2id (19 Mio, 2 itérations, 1 fil).
const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash(randomBytes(16).toString('hex'));
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // Empreinte illisible : on refuse plutôt que de faire planter la requête.
      return false;
    }
  }

  /**
   * Dépense le même temps qu'une vraie vérification. Appelé quand le compte n'existe pas ou est
   * bloqué, pour qu'on ne puisse pas deviner quelles adresses sont inscrites en chronométrant les réponses.
   */
  async burn(password: string): Promise<void> {
    await this.verify(this.dummyHash, password);
  }
}
