import type { INestApplication } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service.js';
import {
  type Browser,
  COMPROMISED_PASSWORD,
  createTestApp,
  InMemoryMailer,
  newBrowser,
  ORIGIN,
  STRONG_PASSWORD,
} from './support/app.js';

const EMAIL = 'ada@example.com';
const NEW_PASSWORD = 'another-long-passphrase-2026';
const MINUTES = 60_000;
// Généré à chaque appel : évite tout mot de passe en dur dans les tests d'échec.
const wrongPassword = (): string => `x-${randomUUID()}`;

describe('Comptes : e-mail et mot de passe (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mailer = new InMemoryMailer();

  beforeAll(async () => {
    app = await createTestApp(mailer);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mailer.clear();
    await prisma.user.deleteMany(); // supprime aussi sessions et jetons (cascade)
  });

  // ─── Aides ─────────────────────────────────────────────────────

  const register = (b: Browser, email = EMAIL, password = STRONG_PASSWORD) =>
    b.post('/api/auth/register', { email, password });

  /** Inscrit et confirme l'adresse : un compte prêt à se connecter. */
  async function createVerifiedUser(email = EMAIL, password = STRONG_PASSWORD) {
    const b = newBrowser(app);
    await register(b, email, password).expect(202);
    await b.post('/api/auth/verify-email', { token: mailer.lastToken(email) }).expect(200);
  }

  /** Connecte un nouveau « navigateur » et renvoie aussi son jeton anti-CSRF. */
  async function loginBrowser(email = EMAIL, password = STRONG_PASSWORD) {
    const b = newBrowser(app);
    const res = await b.post('/api/auth/login', { email, password }).expect(200);
    return { b, csrf: res.body.csrfToken as string, res };
  }

  const userInDb = (email = EMAIL) => prisma.user.findUniqueOrThrow({ where: { email } });

  /** Rend un lien « ancien » : pour passer le délai minimal entre deux e-mails. */
  const ageTokens = (userId: string) =>
    prisma.emailToken.updateMany({ where: { userId }, data: { createdAt: new Date(Date.now() - 5 * MINUTES) } });

  // ─── Inscription ───────────────────────────────────────────────

  describe('inscription', () => {
    it('crée un compte non confirmé et envoie le lien de confirmation', async () => {
      const b = newBrowser(app);
      const res = await register(b).expect(202);
      expect(res.body.message).toBeTypeOf('string');

      const user = await userInDb();
      expect(user.emailVerifiedAt).toBeNull();
      const mails = mailer.to(EMAIL);
      expect(mails).toHaveLength(1);
      expect(mails[0].text).toContain(`${ORIGIN}/verifier-email?token=`);
    });

    it("choisit la langue des e-mails à l'inscription (Accept-Language) et s'en souvient ensuite", async () => {
      const b = newBrowser(app);
      await b.post('/api/auth/register', { email: EMAIL, password: STRONG_PASSWORD }, { acceptLanguage: 'en-US,en;q=0.9' }).expect(202);

      const [welcome] = mailer.to(EMAIL);
      expect(welcome.subject).toBe('Confirm your e-mail address');
      expect((await userInDb()).locale).toBe('EN');

      // La langue est mémorisée : les e-mails suivants restent en anglais même sans l'en-tête.
      await b.post('/api/auth/verify-email', { token: mailer.lastToken(EMAIL) }).expect(200);
      mailer.clear();
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      expect(mailer.to(EMAIL)[0].subject).toBe('Reset your password');
    });

    it('sans Accept-Language (ou avec une langue non gérée), les e-mails restent en français', async () => {
      const b = newBrowser(app);
      await b.post('/api/auth/register', { email: EMAIL, password: STRONG_PASSWORD }, { acceptLanguage: 'de-DE,de;q=0.9' }).expect(202);
      expect(mailer.to(EMAIL)[0].subject).toBe('Confirmez votre adresse e-mail');
      expect((await userInDb()).locale).toBe('FR');
    });

    it("ne stocke jamais le mot de passe ni le jeton en clair", async () => {
      await register(newBrowser(app)).expect(202);
      const user = await userInDb();
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user.passwordHash).not.toContain(STRONG_PASSWORD);

      const token = mailer.lastToken(EMAIL);
      const stored = await prisma.emailToken.findFirstOrThrow({ where: { userId: user.id } });
      expect(stored.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
      expect(stored.tokenHash).not.toBe(token);
    });

    it('normalise l’adresse (espaces, majuscules)', async () => {
      await register(newBrowser(app), '  Ada@Example.COM ').expect(202);
      expect(await prisma.user.count({ where: { email: EMAIL } })).toBe(1);
      expect(mailer.to(EMAIL)).toHaveLength(1);
    });

    it.each([
      ['mot de passe trop court', { email: EMAIL, password: 'court' }],
      ['mot de passe trop long', { email: EMAIL, password: 'a'.repeat(129) }],
      ['adresse invalide', { email: 'pas-un-email', password: STRONG_PASSWORD }],
      ['champ inconnu', { email: EMAIL, password: STRONG_PASSWORD, role: 'admin' }],
      ['corps vide', {}],
    ])('refuse : %s', async (_nom, body) => {
      await newBrowser(app).post('/api/auth/register', body).expect(400);
      expect(await prisma.user.count()).toBe(0);
    });

    it('refuse un mot de passe présent dans une fuite connue', async () => {
      const res = await register(newBrowser(app), EMAIL, COMPROMISED_PASSWORD).expect(400);
      expect(res.body.code).toBe('PASSWORD_COMPROMISED');
      expect(await prisma.user.count()).toBe(0);
    });

    it('répond pareil pour une adresse déjà confirmée, sans rien modifier, et prévient son titulaire', async () => {
      await createVerifiedUser();
      const before = await userInDb();
      mailer.clear();

      const fresh = await register(newBrowser(app), 'autre@example.com').expect(202);
      const existing = await register(newBrowser(app), EMAIL, NEW_PASSWORD).expect(202);
      expect(existing.body).toEqual(fresh.body); // rien ne révèle que le compte existe

      expect((await userInDb()).passwordHash).toBe(before.passwordHash);
      expect(await prisma.user.count()).toBe(2);
      const [notice] = mailer.to(EMAIL);
      expect(notice.subject).toContain('déjà un compte');
      expect(notice.text).not.toContain('token='); // aucun lien de confirmation
    });

    it('deux inscriptions simultanées avec la même adresse créent un seul compte', async () => {
      const results = await Promise.all([register(newBrowser(app)), register(newBrowser(app))]);
      expect(results.map((r) => r.status)).toEqual([202, 202]);
      expect(await prisma.user.count()).toBe(1);
    });

    it("un compte jamais confirmé : la dernière inscription remplace le mot de passe et invalide l'ancien lien", async () => {
      await register(newBrowser(app), EMAIL, STRONG_PASSWORD).expect(202);
      const oldToken = mailer.lastToken(EMAIL);
      await ageTokens((await userInDb()).id);

      await register(newBrowser(app), EMAIL, NEW_PASSWORD).expect(202);
      const newToken = mailer.lastToken(EMAIL);
      expect(newToken).not.toBe(oldToken);

      const b = newBrowser(app);
      await b.post('/api/auth/verify-email', { token: oldToken }).expect(400);
      await b.post('/api/auth/verify-email', { token: newToken }).expect(200);
      await b.post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(401);
      await b.post('/api/auth/login', { email: EMAIL, password: NEW_PASSWORD }).expect(200);
    });

    it('réinscrire coup sur coup une adresse non confirmée ne renvoie pas d’e-mail et ne change rien', async () => {
      await register(newBrowser(app), EMAIL, STRONG_PASSWORD).expect(202);
      const before = await userInDb();

      await register(newBrowser(app), EMAIL, NEW_PASSWORD).expect(202);
      expect(mailer.to(EMAIL)).toHaveLength(1);
      expect((await userInDb()).passwordHash).toBe(before.passwordHash);
    });
  });

  // ─── Confirmation de l'adresse ─────────────────────────────────

  describe("confirmation de l'adresse", () => {
    it('confirme le compte, une seule fois', async () => {
      const b = newBrowser(app);
      await register(b).expect(202);
      const token = mailer.lastToken(EMAIL);

      const res = await b.post('/api/auth/verify-email', { token }).expect(200);
      expect(res.body).toEqual({ emailVerified: true });
      expect((await userInDb()).emailVerifiedAt).not.toBeNull();

      const again = await b.post('/api/auth/verify-email', { token }).expect(400);
      expect(again.body.code).toBe('INVALID_LINK');
    });

    it('refuse un lien expiré ou inconnu', async () => {
      const b = newBrowser(app);
      await register(b).expect(202);
      await prisma.emailToken.updateMany({ data: { expiresAt: new Date(Date.now() - MINUTES) } });

      await b.post('/api/auth/verify-email', { token: mailer.lastToken(EMAIL) }).expect(400);
      await b.post('/api/auth/verify-email', { token: 'x'.repeat(43) }).expect(400);
      expect((await userInDb()).emailVerifiedAt).toBeNull();
    });

    it("un lien de confirmation ne sert pas à réinitialiser un mot de passe, et inversement", async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      const resetToken = mailer.lastToken(EMAIL);
      await b.post('/api/auth/verify-email', { token: resetToken }).expect(400);

      await register(b, 'nouveau@example.com').expect(202);
      const verifyToken = mailer.lastToken('nouveau@example.com');
      await b.post('/api/auth/reset-password', { token: verifyToken, password: NEW_PASSWORD }).expect(400);
    });

    it('avec dix requêtes simultanées, le lien ne sert qu’une fois', async () => {
      await register(newBrowser(app)).expect(202);
      const token = mailer.lastToken(EMAIL);
      const results = await Promise.all(
        Array.from({ length: 10 }, () => newBrowser(app).post('/api/auth/verify-email', { token })),
      );
      const statuses = results.map((r) => r.status);
      expect(statuses.filter((status) => status === 200)).toHaveLength(1);
      expect(statuses.filter((status) => status === 400)).toHaveLength(9);
    });

    it('renvoie un lien après le délai minimal, et l’ancien cesse de marcher', async () => {
      const b = newBrowser(app);
      await register(b).expect(202);
      const oldToken = mailer.lastToken(EMAIL);

      await b.post('/api/auth/resend-verification', { email: EMAIL }).expect(202);
      expect(mailer.to(EMAIL)).toHaveLength(1); // trop tôt : rien n'est renvoyé

      await ageTokens((await userInDb()).id);
      await b.post('/api/auth/resend-verification', { email: EMAIL }).expect(202);
      expect(mailer.to(EMAIL)).toHaveLength(2);
      await b.post('/api/auth/verify-email', { token: oldToken }).expect(400);
      await b.post('/api/auth/verify-email', { token: mailer.lastToken(EMAIL) }).expect(200);
    });

    it('la demande de nouveau lien répond pareil pour une adresse inconnue ou déjà confirmée', async () => {
      await createVerifiedUser();
      mailer.clear();
      const b = newBrowser(app);
      const known = await b.post('/api/auth/resend-verification', { email: EMAIL }).expect(202);
      const unknown = await b.post('/api/auth/resend-verification', { email: 'inconnu@example.com' }).expect(202);
      expect(unknown.body).toEqual(known.body);
      expect(mailer.outbox).toHaveLength(0);
    });
  });

  // ─── Connexion ─────────────────────────────────────────────────

  describe('connexion', () => {
    it('ouvre une session : cookie protégé, jeton anti-CSRF, aucun secret dans la réponse', async () => {
      await createVerifiedUser();
      const { res } = await loginBrowser();

      expect(res.body.user).toMatchObject({ email: EMAIL });
      expect(JSON.stringify(res.body)).not.toMatch(/argon2|passwordHash/);
      const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('session='));
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\//);
      expect(cookie).not.toMatch(/Secure/i); // développement local en http

      // Le cookie contient le jeton ; la base n'en garde que l'empreinte.
      const value = decodeURIComponent(cookie!.split(';')[0].split('=')[1]);
      const session = await prisma.session.findFirstOrThrow();
      expect(session.tokenHash).toBe(createHash('sha256').update(value).digest('hex'));
      expect(session.tokenHash).not.toBe(value);
    });

    it("accepte l'adresse quelle que soit la casse", async () => {
      await createVerifiedUser();
      await newBrowser(app).post('/api/auth/login', { email: ' ADA@Example.com ', password: STRONG_PASSWORD }).expect(200);
    });

    it("répond pareil pour un mauvais mot de passe et pour une adresse inconnue", async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      const wrong = await b.post('/api/auth/login', { email: EMAIL, password: 'mauvais-mot-de-passe' }).expect(401);
      const unknown = await b.post('/api/auth/login', { email: 'inconnu@example.com', password: STRONG_PASSWORD }).expect(401);
      expect(unknown.body).toEqual(wrong.body);
      expect(wrong.headers['set-cookie']).toBeUndefined();
    });

    it('refuse un compte non confirmé, sans ouvrir de session', async () => {
      const b = newBrowser(app);
      await register(b).expect(202);
      const res = await b.post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(await prisma.session.count()).toBe(0);

      // Un mauvais mot de passe reste indiscernable d'un compte inconnu : pas de fuite sur l'état du compte.
      await b.post('/api/auth/login', { email: EMAIL, password: 'mauvais-mot-de-passe' }).expect(401);
    });

    it('bloque le compte après 5 échecs, même avec le bon mot de passe, puis le débloque', async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      for (let i = 0; i < 5; i += 1) {
        await b.post('/api/auth/login', { email: EMAIL, password: wrongPassword() }).expect(401);
      }
      const locked = await userInDb();
      expect(locked.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

      // Bloqué : le bon mot de passe est refusé avec la même réponse générique.
      const refused = await b.post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(401);
      expect(refused.body.message).toBe('E-mail ou mot de passe incorrect.');

      await prisma.user.update({ where: { email: EMAIL }, data: { lockedUntil: new Date(Date.now() - MINUTES) } });
      await b.post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(200);
      expect(await userInDb()).toMatchObject({ failedLogins: 0, lockedUntil: null });
    });

    it('un succès remet le compteur d’échecs à zéro', async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      for (let i = 0; i < 3; i += 1) {
        await b.post('/api/auth/login', { email: EMAIL, password: wrongPassword() }).expect(401);
      }
      expect((await userInDb()).failedLogins).toBe(3);
      await b.post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(200);
      expect((await userInDb()).failedLogins).toBe(0);
    });

    it('les échecs anciens ne comptent plus', async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      for (let i = 0; i < 4; i += 1) {
        await b.post('/api/auth/login', { email: EMAIL, password: wrongPassword() }).expect(401);
      }
      await prisma.user.update({ where: { email: EMAIL }, data: { lastFailedLoginAt: new Date(Date.now() - 20 * MINUTES) } });

      await b.post('/api/auth/login', { email: EMAIL, password: wrongPassword() }).expect(401);
      expect(await userInDb()).toMatchObject({ failedLogins: 1, lockedUntil: null });
    });

    it('limite les tentatives par adresse IP, sans pénaliser les autres', async () => {
      const b = newBrowser(app);
      for (let i = 0; i < 10; i += 1) {
        await b.post('/api/auth/login', { email: 'inconnu@example.com', password: 'nimporte-quoi-1234' }).expect(401);
      }
      await b.post('/api/auth/login', { email: 'inconnu@example.com', password: 'nimporte-quoi-1234' }).expect(429);

      // Une autre IP (un autre client derrière nginx) n'est pas touchée.
      await newBrowser(app).post('/api/auth/login', { email: 'inconnu@example.com', password: 'nimporte-quoi-1234' }).expect(401);
    });
  });

  // ─── Session ───────────────────────────────────────────────────

  describe('session', () => {
    it('GET /me renvoie le compte et le jeton anti-CSRF de la session', async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      const res = await b.get('/api/auth/me').expect(200);
      expect(res.body.user.email).toBe(EMAIL);
      expect(res.body.csrfToken).toBe(csrf);
    });

    it('refuse sans cookie, avec un cookie falsifié ou une session expirée', async () => {
      await createVerifiedUser();
      await newBrowser(app).get('/api/auth/me').expect(401);
      await newBrowser(app).get('/api/auth/me').set('Cookie', 'session=jeton-invente').expect(401);

      const { b } = await loginBrowser();
      await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - MINUTES) } });
      await b.get('/api/auth/me').expect(401);
    });

    it('se déconnecter ferme la session et efface le cookie, même une session déjà expirée', async () => {
      await createVerifiedUser();
      const { b } = await loginBrowser();
      const res = await b.post('/api/auth/logout').expect(204);
      expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/^session=;/);
      expect(await prisma.session.count()).toBe(0);
      await b.get('/api/auth/me').expect(401);

      await newBrowser(app).post('/api/auth/logout').expect(204); // sans session : pas d'erreur
    });

    it('« me déconnecter partout » ferme toutes les sessions du compte, et seulement les siennes', async () => {
      await createVerifiedUser();
      await createVerifiedUser('grace@example.com');
      const first = await loginBrowser();
      const second = await loginBrowser();
      const other = await loginBrowser('grace@example.com');

      await first.b.post('/api/auth/logout-all', {}, { csrf: first.csrf }).expect(204);
      await first.b.get('/api/auth/me').expect(401);
      await second.b.get('/api/auth/me').expect(401);
      await other.b.get('/api/auth/me').expect(200);
    });

    it("chaque connexion crée une nouvelle session (pas de réutilisation de jeton)", async () => {
      await createVerifiedUser();
      const first = await loginBrowser();
      const second = await loginBrowser();
      const [a, b] = (await prisma.session.findMany()).map((s) => s.tokenHash);
      expect(a).not.toBe(b);
      expect(first.csrf).not.toBe(second.csrf);
    });
  });

  // ─── Protection CSRF ───────────────────────────────────────────

  describe('protection CSRF', () => {
    it("refuse une requête qui modifie des données sans origine, ou depuis un autre site", async () => {
      const b = newBrowser(app);
      const body = { email: EMAIL, password: STRONG_PASSWORD };
      await b.post('/api/auth/register', body, { origin: null }).expect(403);
      await b.post('/api/auth/register', body, { origin: 'https://site-malveillant.example' }).expect(403);
      await b.post('/api/auth/register', body, { origin: 'null' }).expect(403);
      await b.post('/api/auth/login', body, { origin: 'https://fondamentalplugin.fr.evil.example' }).expect(403);
      expect(await prisma.user.count()).toBe(0);
    });

    it('accepte le Referer du site quand Origin est absent', async () => {
      await newBrowser(app)
        .post('/api/auth/register', { email: EMAIL, password: STRONG_PASSWORD }, { origin: null })
        .set('Referer', `${ORIGIN}/inscription`)
        .expect(202);
    });

    it('ne contrôle pas l’origine des requêtes de lecture', async () => {
      await newBrowser(app).get('/api/health', { origin: null }).expect(200);
    });

    it('exige le jeton X-CSRF-Token sur les requêtes authentifiées qui modifient des données', async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      const body = { currentPassword: STRONG_PASSWORD, newPassword: NEW_PASSWORD };

      await b.post('/api/auth/change-password', body).expect(403); // sans jeton
      await b.post('/api/auth/change-password', body, { csrf: 'jeton-invente' }).expect(403); // mauvais jeton
      await b.post('/api/auth/logout-all', {}, { csrf: `${csrf}x` }).expect(403);
      await b.post('/api/auth/change-password', body, { csrf }).expect(204);
    });

    it('le jeton d’une session ne marche pas avec une autre', async () => {
      await createVerifiedUser();
      const first = await loginBrowser();
      const second = await loginBrowser();
      await first.b.post('/api/auth/logout-all', {}, { csrf: second.csrf }).expect(403);
    });

    it('sans session, une route protégée répond 401', async () => {
      await newBrowser(app)
        .post('/api/auth/change-password', { currentPassword: STRONG_PASSWORD, newPassword: NEW_PASSWORD })
        .expect(401);
    });
  });

  // ─── Mot de passe oublié ───────────────────────────────────────

  describe('mot de passe oublié', () => {
    it('répond pareil que le compte existe ou non, et n’écrit qu’au titulaire', async () => {
      await createVerifiedUser();
      mailer.clear();
      const b = newBrowser(app);
      const known = await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      const unknown = await b.post('/api/auth/forgot-password', { email: 'inconnu@example.com' }).expect(202);
      expect(unknown.body).toEqual(known.body);
      expect(mailer.to(EMAIL)).toHaveLength(1);
      expect(mailer.to('inconnu@example.com')).toHaveLength(0);
      expect(mailer.to(EMAIL)[0].text).toContain(`${ORIGIN}/reinitialiser-mot-de-passe?token=`);
    });

    it("n'envoie pas d'autre e-mail avant le délai minimal", async () => {
      await createVerifiedUser();
      mailer.clear();
      const b = newBrowser(app);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      expect(mailer.to(EMAIL)).toHaveLength(1);
    });

    it('un nouveau lien invalide le précédent', async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      const oldToken = mailer.lastToken(EMAIL);
      await ageTokens((await userInDb()).id);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);

      await b.post('/api/auth/reset-password', { token: oldToken, password: NEW_PASSWORD }).expect(400);
      await b.post('/api/auth/reset-password', { token: mailer.lastToken(EMAIL), password: NEW_PASSWORD }).expect(204);
    });

    it('change le mot de passe, ferme toutes les sessions, débloque le compte et prévient le titulaire', async () => {
      await createVerifiedUser();
      const open = await loginBrowser();
      await prisma.user.update({ where: { email: EMAIL }, data: { failedLogins: 3, lockedUntil: new Date(Date.now() + 10 * MINUTES) } });

      const b = newBrowser(app);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      const token = mailer.lastToken(EMAIL);
      mailer.clear();
      await b.post('/api/auth/reset-password', { token, password: NEW_PASSWORD }).expect(204);

      await open.b.get('/api/auth/me').expect(401); // l'ancienne session est fermée
      expect(await userInDb()).toMatchObject({ failedLogins: 0, lockedUntil: null });
      await b.post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(401);
      await b.post('/api/auth/login', { email: EMAIL, password: NEW_PASSWORD }).expect(200);
      expect(mailer.to(EMAIL)[0].subject).toContain('modifié');
    });

    it('le lien ne sert qu’une fois', async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      const token = mailer.lastToken(EMAIL);
      await b.post('/api/auth/reset-password', { token, password: NEW_PASSWORD }).expect(204);
      const again = await b.post('/api/auth/reset-password', { token, password: 'encore-un-autre-mot-de-passe' }).expect(400);
      expect(again.body.code).toBe('INVALID_LINK');
      await b.post('/api/auth/login', { email: EMAIL, password: NEW_PASSWORD }).expect(200);
    });

    it('avec dix requêtes simultanées, le lien ne sert qu’une fois (un seul mot de passe est appliqué)', async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      const token = mailer.lastToken(EMAIL);
      const passwords = Array.from({ length: 10 }, (_, i) => `mot-de-passe-concurrent-${i}`);

      const results = await Promise.all(
        passwords.map((password) => newBrowser(app).post('/api/auth/reset-password', { token, password })),
      );
      const winners = results.flatMap((r, i) => (r.status === 204 ? [passwords[i]] : []));
      expect(winners).toHaveLength(1);
      expect(results.filter((r) => r.status === 400)).toHaveLength(9);

      // Le seul mot de passe qui marche est celui de la requête gagnante.
      await b.post('/api/auth/login', { email: EMAIL, password: winners[0] }).expect(200);
    });

    it('refuse un lien expiré', async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      await prisma.emailToken.updateMany({ data: { expiresAt: new Date(Date.now() - MINUTES) } });
      await b.post('/api/auth/reset-password', { token: mailer.lastToken(EMAIL), password: NEW_PASSWORD }).expect(400);
    });

    it('un mot de passe refusé ne consomme pas le lien', async () => {
      await createVerifiedUser();
      const b = newBrowser(app);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      const token = mailer.lastToken(EMAIL);

      await b.post('/api/auth/reset-password', { token, password: 'court' }).expect(400);
      const pwned = await b.post('/api/auth/reset-password', { token, password: COMPROMISED_PASSWORD }).expect(400);
      expect(pwned.body.code).toBe('PASSWORD_COMPROMISED');
      await b.post('/api/auth/reset-password', { token, password: NEW_PASSWORD }).expect(204);
    });

    it('confirme aussi l’adresse : le lien prouve qu’on lit cette boîte', async () => {
      const b = newBrowser(app);
      await register(b).expect(202);
      await ageTokens((await userInDb()).id);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(202);
      await b.post('/api/auth/reset-password', { token: mailer.lastToken(EMAIL), password: NEW_PASSWORD }).expect(204);

      expect((await userInDb()).emailVerifiedAt).not.toBeNull();
      await b.post('/api/auth/login', { email: EMAIL, password: NEW_PASSWORD }).expect(200);
    });
  });

  // ─── Changement de mot de passe ────────────────────────────────

  describe('changement de mot de passe', () => {
    it('change le mot de passe, garde la session courante, ferme les autres et prévient le titulaire', async () => {
      await createVerifiedUser();
      const current = await loginBrowser();
      const other = await loginBrowser();
      mailer.clear();

      await current.b
        .post('/api/auth/change-password', { currentPassword: STRONG_PASSWORD, newPassword: NEW_PASSWORD }, { csrf: current.csrf })
        .expect(204);

      await current.b.get('/api/auth/me').expect(200);
      await other.b.get('/api/auth/me').expect(401);
      const b = newBrowser(app);
      await b.post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(401);
      await b.post('/api/auth/login', { email: EMAIL, password: NEW_PASSWORD }).expect(200);
      expect(mailer.to(EMAIL)[0].subject).toContain('modifié');
    });

    it.each([
      ['mot de passe actuel incorrect', { currentPassword: 'pas-le-bon-mot-de-passe', newPassword: NEW_PASSWORD }, 'CURRENT_PASSWORD_INVALID'],
      ['nouveau mot de passe identique', { currentPassword: STRONG_PASSWORD, newPassword: STRONG_PASSWORD }, 'SAME_PASSWORD'],
      ['nouveau mot de passe compromis', { currentPassword: STRONG_PASSWORD, newPassword: COMPROMISED_PASSWORD }, 'PASSWORD_COMPROMISED'],
    ])('refuse : %s', async (_nom, body, code) => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      const res = await b.post('/api/auth/change-password', body, { csrf }).expect(400);
      expect(res.body.code).toBe(code);
      await newBrowser(app).post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(200);
    });

    it('refuse un nouveau mot de passe trop court', async () => {
      await createVerifiedUser();
      const { b, csrf } = await loginBrowser();
      await b.post('/api/auth/change-password', { currentPassword: STRONG_PASSWORD, newPassword: 'court' }, { csrf }).expect(400);
    });
  });

  // ─── Isolation entre comptes ───────────────────────────────────

  it("une session n'a accès qu'à son propre compte", async () => {
    await createVerifiedUser();
    await createVerifiedUser('grace@example.com', NEW_PASSWORD);
    const ada = await loginBrowser();
    const grace = await loginBrowser('grace@example.com', NEW_PASSWORD);

    expect((await ada.b.get('/api/auth/me').expect(200)).body.user.email).toBe(EMAIL);
    expect((await grace.b.get('/api/auth/me').expect(200)).body.user.email).toBe('grace@example.com');

    // Changer le mot de passe d'Ada ne touche pas celui de Grace.
    await ada.b
      .post('/api/auth/change-password', { currentPassword: STRONG_PASSWORD, newPassword: 'un-nouveau-mot-de-passe-1' }, { csrf: ada.csrf })
      .expect(204);
    await newBrowser(app).post('/api/auth/login', { email: 'grace@example.com', password: NEW_PASSWORD }).expect(200);
  });
});

// ─── Envoi d'e-mails indisponible ────────────────────────────────

describe("Comptes : envoi d'e-mails indisponible (e2e)", () => {
  class UnavailableMailer extends InMemoryMailer {
    override readonly isConfigured = false;
  }
  class BrokenMailer extends InMemoryMailer {
    override async send(): Promise<void> {
      throw new Error('service en panne');
    }
  }

  it("sans moyen d'envoi, l'inscription et la réinitialisation répondent 503 sans rien créer", async () => {
    const app = await createTestApp(new UnavailableMailer());
    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany();
    try {
      const b = newBrowser(app);
      await b.post('/api/auth/register', { email: EMAIL, password: STRONG_PASSWORD }).expect(503);
      await b.post('/api/auth/resend-verification', { email: EMAIL }).expect(503);
      await b.post('/api/auth/forgot-password', { email: EMAIL }).expect(503);
      expect(await prisma.user.count()).toBe(0);
      await b.post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(401); // le reste fonctionne
    } finally {
      await app.close();
    }
  });

  it("une panne du service d'e-mails n'empêche pas de répondre (et ne change pas la réponse)", async () => {
    const app = await createTestApp(new BrokenMailer());
    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany();
    try {
      const b = newBrowser(app);
      await b.post('/api/auth/register', { email: EMAIL, password: STRONG_PASSWORD }).expect(202);
      expect(await prisma.user.count()).toBe(1);
    } finally {
      await app.close();
    }
  });
});
