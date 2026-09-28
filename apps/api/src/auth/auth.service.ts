import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AccountExport } from '@fondamental/shared';
import type { Env } from '../config/env.js';
import { EmailTokenType, type User } from '../generated/prisma/client.js';
import { type MailLocale, parseMailLocale } from './locale.js';
import { Mailer } from '../mail/mailer.js';
import {
  accountDeletedEmail,
  accountExistsEmail,
  type MailContent,
  passwordChangedEmail,
  passwordResetEmail,
  verificationEmail,
} from '../mail/templates.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EMAIL_COOLDOWN_MS,
  FAILED_LOGIN_WINDOW_MS,
  LOCKOUT_MS,
  MAX_FAILED_LOGINS,
  MESSAGES,
  RESET_PASSWORD_TTL_MS,
  VERIFY_EMAIL_TTL_MS,
} from './auth.constants.js';
import { PasswordService } from './password.service.js';
import { PwnedPasswordsService } from './pwned-passwords.service.js';
import { type CreatedSession, SessionService } from './session.service.js';
import { generateToken, hashToken } from './tokens.js';

/** Erreur Prisma « valeur déjà utilisée » (contrainte d'unicité). */
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly siteUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly pwned: PwnedPasswordsService,
    private readonly sessions: SessionService,
    private readonly mailer: Mailer,
    config: ConfigService<Env, true>,
  ) {
    this.siteUrl = config.get('SITE_URL', { infer: true });
  }

  // ─── Inscription et confirmation de l'adresse ──────────────────

  /**
   * Répond toujours pareil, que l'adresse soit déjà inscrite ou non : on ne révèle pas qui a un compte.
   *
   * - Adresse nouvelle : compte créé (inutilisable tant que l'adresse n'est pas confirmée). `acceptLanguage`
   *   (en-tête du navigateur) choisit la langue des e-mails, mémorisée sur le compte et jamais redemandée.
   * - Compte jamais confirmé : le dernier inscrit remplace le mot de passe. Personne ne peut donc « réserver »
   *   l'adresse d'un tiers avec un mot de passe qu'il connaît : et de toute façon aucune connexion n'est
   *   possible avant la confirmation.
   * - Compte confirmé : rien ne change ; le titulaire reçoit un e-mail de prévention, dans sa langue déjà connue.
   */
  async register(email: string, password: string, acceptLanguage?: string): Promise<void> {
    this.assertMailAvailable();
    await this.assertPasswordAllowed(password);
    // Toujours calculé, même si le compte existe : la durée de la réponse ne trahit rien.
    const passwordHash = await this.passwords.hash(password);

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing?.emailVerifiedAt) {
      this.notify(email, accountExistsEmail(this.link('reinitialiser-mot-de-passe'), this.mailLocale(existing)));
      return;
    }

    let user: User;
    if (existing) {
      if (await this.hasRecentToken(existing.id, EmailTokenType.VERIFY_EMAIL)) return;
      user = await this.prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash, failedLogins: 0, lastFailedLoginAt: null, lockedUntil: null },
      });
    } else {
      try {
        const locale = parseMailLocale(acceptLanguage).toUpperCase() as 'FR' | 'EN';
        user = await this.prisma.user.create({ data: { email, passwordHash, locale } });
      } catch (error) {
        // Deux inscriptions simultanées avec la même adresse : l'autre a gagné, rien à faire.
        if ((error as { code?: string }).code === UNIQUE_VIOLATION) return;
        throw error;
      }
    }
    await this.sendVerificationEmail(user);
  }

  /** Langue des e-mails du compte, telle que stockée (`fr`/`en`). */
  private mailLocale(user: Pick<User, 'locale'>): MailLocale {
    return (user.locale as string).toLowerCase() as MailLocale;
  }

  /** Renvoie le lien de confirmation. Réponse identique quelle que soit l'adresse. */
  async resendVerification(email: string): Promise<void> {
    this.assertMailAvailable();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) return;
    if (await this.hasRecentToken(user.id, EmailTokenType.VERIFY_EMAIL)) return;
    await this.sendVerificationEmail(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.findUsableToken(token, EmailTokenType.VERIFY_EMAIL);
    await this.prisma.$transaction(async (tx) => {
      await this.consumeToken(tx, record.id);
      await tx.user.updateMany({
        where: { id: record.userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: new Date() },
      });
      await tx.emailToken.deleteMany({ where: { userId: record.userId, type: EmailTokenType.VERIFY_EMAIL, usedAt: null } });
    });
  }

  // ─── Connexion et déconnexion ──────────────────────────────────

  async login(email: string, password: string): Promise<{ user: User; session: CreatedSession }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const now = new Date();

    // Compte inconnu, sans mot de passe ou bloqué : même réponse et même durée qu'un mauvais mot de passe.
    if (!user?.passwordHash || (user.lockedUntil && user.lockedUntil > now)) {
      await this.passwords.burn(password);
      throw new UnauthorizedException(MESSAGES.invalidCredentials);
    }
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      await this.recordFailedLogin(user);
      throw new UnauthorizedException(MESSAGES.invalidCredentials);
    }
    // Mot de passe correct mais adresse non confirmée : pas de session. Le message n'apprend rien
    // à quelqu'un qui ne connaît pas déjà le mot de passe.
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({ code: 'EMAIL_NOT_VERIFIED', message: MESSAGES.emailNotVerified });
    }
    // Compte bloqué par un admin (#105) : dit seulement à qui connaît déjà le mot de passe.
    if (user.blockedAt) {
      throw new ForbiddenException({ code: 'ACCOUNT_BLOCKED', message: MESSAGES.accountBlocked });
    }

    if (user.failedLogins > 0 || user.lastFailedLoginAt || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lastFailedLoginAt: null, lockedUntil: null },
      });
    }
    return { user, session: await this.sessions.create(user.id) };
  }

  async logout(token: string): Promise<void> {
    await this.sessions.revoke(token);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.revokeAll(userId);
  }

  // ─── Mot de passe oublié, réinitialisation, changement ─────────

  /** Réponse identique que le compte existe ou non. */
  async forgotPassword(email: string): Promise<void> {
    this.assertMailAvailable();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    if (await this.hasRecentToken(user.id, EmailTokenType.RESET_PASSWORD)) return;
    const token = await this.issueToken(user.id, EmailTokenType.RESET_PASSWORD, RESET_PASSWORD_TTL_MS);
    this.notify(user.email, passwordResetEmail(this.link('reinitialiser-mot-de-passe', token), this.mailLocale(user)));
  }

  /**
   * Définit un nouveau mot de passe grâce au lien reçu par e-mail. Effets : le lien est consommé, toutes
   * les sessions sont fermées, le compte est débloqué, et l'adresse est confirmée (le lien prouve qu'on
   * lit cette boîte). Un mot de passe refusé ne consomme pas le lien.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.findUsableToken(token, EmailTokenType.RESET_PASSWORD);
    await this.assertPasswordAllowed(newPassword);
    const passwordHash = await this.passwords.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await this.consumeToken(tx, record.id);
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          failedLogins: 0,
          lastFailedLoginAt: null,
          lockedUntil: null,
          emailVerifiedAt: record.user.emailVerifiedAt ?? new Date(),
        },
      });
      await tx.session.deleteMany({ where: { userId: record.userId } });
      await tx.emailToken.deleteMany({ where: { userId: record.userId, usedAt: null } });
    });
    this.notify(record.user.email, passwordChangedEmail(this.mailLocale(record.user)));
  }

  /** Change le mot de passe d'un compte connecté. Les autres sessions sont fermées, la courante est conservée. */
  async changePassword(user: User, sessionId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (!user.passwordHash) throw new BadRequestException({ code: 'NO_PASSWORD', message: MESSAGES.noPassword });
    if (!(await this.passwords.verify(user.passwordHash, currentPassword))) {
      throw new BadRequestException({ code: 'CURRENT_PASSWORD_INVALID', message: MESSAGES.currentPasswordInvalid });
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException({ code: 'SAME_PASSWORD', message: MESSAGES.samePassword });
    }
    await this.assertPasswordAllowed(newPassword);
    const passwordHash = await this.passwords.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: user.id, id: { not: sessionId } } });
    });
    this.notify(user.email, passwordChangedEmail(this.mailLocale(user)));
  }

  // ─── Données personnelles (RGPD) ───────────────────────────────

  /** Toutes les données que la boutique détient sur le compte, sans aucun secret (ni mot de passe, ni jeton). */
  async exportAccount(user: User, currentSessionId: string): Promise<AccountExport> {
    const sessions = await this.prisma.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true, expiresAt: true },
    });
    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        hasPassword: user.passwordHash !== null,
      },
      sessions: sessions.map((s) => ({
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        current: s.id === currentSessionId,
      })),
    };
  }

  /**
   * Supprime le compte et tout ce qui s'y rattache (sessions, liens en attente). Le mot de passe est redemandé :
   * une session volée ne suffit pas à détruire un compte. Les échecs comptent comme à la connexion (blocage).
   *
   * Quand les commandes existeront (#23), elles seront **anonymisées et conservées** (obligation comptable) dans
   * la même transaction, et les licences resteront valides.
   */
  async deleteAccount(user: User, password: string): Promise<void> {
    if (!user.passwordHash) throw new BadRequestException({ code: 'NO_PASSWORD', message: MESSAGES.noPassword });
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.passwords.burn(password);
      throw new BadRequestException({ code: 'CURRENT_PASSWORD_INVALID', message: MESSAGES.currentPasswordInvalid });
    }
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      await this.recordFailedLogin(user);
      throw new BadRequestException({ code: 'CURRENT_PASSWORD_INVALID', message: MESSAGES.currentPasswordInvalid });
    }
    const { count } = await this.prisma.user.deleteMany({ where: { id: user.id } });
    // Deux demandes simultanées : une seule supprime, une seule prévient.
    if (count === 1) {
      this.logger.log(`Compte supprimé (${user.id})`);
      this.notify(user.email, accountDeletedEmail(this.mailLocale(user)));
    }
  }

  // ─── Outils internes ───────────────────────────────────────────

  /** Sans moyen d'envoi, on refuse d'emblée (503) plutôt que d'accepter une demande qui restera sans suite. */
  private assertMailAvailable(): void {
    if (!this.mailer.isConfigured) throw new ServiceUnavailableException(MESSAGES.mailUnavailable);
  }

  private async assertPasswordAllowed(password: string): Promise<void> {
    if (await this.pwned.isPwned(password)) {
      throw new BadRequestException({ code: 'PASSWORD_COMPROMISED', message: MESSAGES.passwordCompromised });
    }
  }

  private async recordFailedLogin(user: User): Promise<void> {
    const now = new Date();
    // Les échecs trop anciens ne comptent plus : le compteur repart de zéro.
    await this.prisma.user.updateMany({
      where: {
        id: user.id,
        OR: [{ lastFailedLoginAt: null }, { lastFailedLoginAt: { lt: new Date(now.getTime() - FAILED_LOGIN_WINDOW_MS) } }],
      },
      data: { failedLogins: 0 },
    });
    // Incrément atomique : deux essais simultanés comptent bien pour deux.
    const { failedLogins } = await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: { increment: 1 }, lastFailedLoginAt: now },
      select: { failedLogins: true },
    });
    if (failedLogins >= MAX_FAILED_LOGINS) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: new Date(now.getTime() + LOCKOUT_MS) },
      });
    }
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const token = await this.issueToken(user.id, EmailTokenType.VERIFY_EMAIL, VERIFY_EMAIL_TTL_MS);
    this.notify(user.email, verificationEmail(this.link('verifier-email', token), this.mailLocale(user)));
  }

  /** Crée un lien à usage unique. Les liens précédents de même type, non utilisés, sont invalidés. */
  private async issueToken(userId: string, type: EmailTokenType, ttlMs: number): Promise<string> {
    const token = generateToken();
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.emailToken.deleteMany({
        where: { userId, OR: [{ expiresAt: { lte: now } }, { type, usedAt: null }] },
      }),
      this.prisma.emailToken.create({
        data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + ttlMs) },
      }),
    ]);
    return token;
  }

  private async hasRecentToken(userId: string, type: EmailTokenType): Promise<boolean> {
    const recent = await this.prisma.emailToken.count({
      where: { userId, type, createdAt: { gt: new Date(Date.now() - EMAIL_COOLDOWN_MS) } },
    });
    return recent > 0;
  }

  /** Le lien correspondant au jeton s'il existe, est du bon type, n'a pas servi et n'a pas expiré. */
  private async findUsableToken(token: string, type: EmailTokenType) {
    const record = await this.prisma.emailToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!record || record.type !== type || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException({ code: 'INVALID_LINK', message: MESSAGES.invalidLink });
    }
    return record;
  }

  /** Marque le lien comme utilisé, de façon atomique : de deux requêtes simultanées, une seule réussit. */
  private async consumeToken(
    tx: Pick<PrismaService, 'emailToken'>,
    id: string,
  ): Promise<void> {
    const now = new Date();
    const { count } = await tx.emailToken.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (count !== 1) throw new BadRequestException({ code: 'INVALID_LINK', message: MESSAGES.invalidLink });
  }

  /** Lien vers une page du site (jamais vers l'API : les antivirus des messageries ouvrent les liens tout seuls). */
  private link(page: string, token?: string): string {
    return token ? `${this.siteUrl}/${page}?token=${token}` : `${this.siteUrl}/${page}`;
  }

  /**
   * Envoi sans attendre : la réponse ne dépend pas de la rapidité du service d'e-mails, donc son
   * délai ne révèle pas si un e-mail est parti. Un échec est journalisé sans adresse ni contenu.
   */
  private notify(to: string, content: MailContent): void {
    this.mailer.send({ to, ...content }).catch((error: Error) => {
      this.logger.error(`Envoi d'e-mail échoué : ${error.message}`);
    });
  }
}
