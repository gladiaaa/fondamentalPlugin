import type { INestApplication } from '@nestjs/common';
import { CleanupService } from '../src/auth/cleanup.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, InMemoryMailer, newBrowser, STRONG_PASSWORD } from './support/app.js';

const EMAIL = 'ada@example.com';
const HOUR = 60 * 60_000;

describe('Nettoyage des sessions et liens expirés (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cleanup: CleanupService;
  const mailer = new InMemoryMailer();

  beforeAll(async () => {
    app = await createTestApp(mailer);
    prisma = app.get(PrismaService);
    cleanup = app.get(CleanupService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mailer.clear();
    await prisma.user.deleteMany();
  });

  async function createUser() {
    const b = newBrowser(app);
    await b.post('/api/auth/register', { email: EMAIL, password: STRONG_PASSWORD }).expect(202);
    await b.post('/api/auth/verify-email', { token: mailer.lastToken(EMAIL) }).expect(200);
    return prisma.user.findUniqueOrThrow({ where: { email: EMAIL } });
  }

  const addSession = (userId: string, expiresAt: Date) =>
    prisma.session.create({ data: { userId, tokenHash: `h-${Math.random()}`, csrfToken: 'c', expiresAt } });

  const addToken = (userId: string, data: { expiresAt: Date; usedAt?: Date }) =>
    prisma.emailToken.create({
      data: { userId, type: 'RESET_PASSWORD', tokenHash: `h-${Math.random()}`, ...data },
    });

  it('supprime les sessions expirées et garde les valables', async () => {
    const user = await createUser();
    const expired = await addSession(user.id, new Date(Date.now() - HOUR));
    const valid = await addSession(user.id, new Date(Date.now() + HOUR));

    const result = await cleanup.purgeExpired();

    expect(result.sessions).toBe(1);
    const ids = (await prisma.session.findMany({ where: { userId: user.id } })).map((s) => s.id);
    expect(ids).toContain(valid.id);
    expect(ids).not.toContain(expired.id);
  });

  it("supprime les liens expirés ou utilisés depuis plus d'un jour, garde les autres", async () => {
    const user = await createUser();
    await prisma.emailToken.deleteMany({ where: { userId: user.id } });
    const future = new Date(Date.now() + HOUR);
    const expired = await addToken(user.id, { expiresAt: new Date(Date.now() - HOUR) });
    const usedLongAgo = await addToken(user.id, { expiresAt: future, usedAt: new Date(Date.now() - 25 * HOUR) });
    const usedRecently = await addToken(user.id, { expiresAt: future, usedAt: new Date(Date.now() - HOUR) });
    const pending = await addToken(user.id, { expiresAt: future });

    const result = await cleanup.purgeExpired();

    expect(result.emailTokens).toBe(2);
    const ids = (await prisma.emailToken.findMany({ where: { userId: user.id } })).map((t) => t.id);
    expect(ids.sort()).toEqual([usedRecently.id, pending.id].sort());
    expect(ids).not.toContain(expired.id);
    expect(ids).not.toContain(usedLongAgo.id);
  });

  it('ne touche ni aux comptes ni à une session ouverte, et peut se relancer', async () => {
    await createUser();
    const login = newBrowser(app);
    await login.post('/api/auth/login', { email: EMAIL, password: STRONG_PASSWORD }).expect(200);

    await cleanup.purgeExpired();
    expect(await cleanup.purgeExpired()).toEqual({ sessions: 0, emailTokens: 0 });

    await login.get('/api/auth/me').expect(200);
    expect(await prisma.user.count({ where: { email: EMAIL } })).toBe(1);
  });

  it("ne lance pas de tâche de fond pendant les tests", () => {
    expect((cleanup as unknown as { timer?: unknown }).timer).toBeUndefined();
  });
});
