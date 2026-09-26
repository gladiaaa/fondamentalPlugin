import type { INestApplication } from '@nestjs/common';
import type { ReleaseFileResponse } from '@fondamental/shared';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, InMemoryMailer, newBrowser } from './support/app.js';
import { makePluginJar, makeZip } from './support/zip.js';

const TOKEN = 'test-only-releases-token-0123456789abcdef0123456789abcdef';
// Les tests créent leurs versions de plugin (préfixe `e2e-`) et écrivent dans un dossier temporaire.

describe('Publication des versions par la CI (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const dir = process.env['RELEASES_DIR'] as string;
  let nextIp = 0;

  beforeAll(async () => {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    app = await createTestApp(new InMemoryMailer());
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    await prisma.release.deleteMany({ where: { version: { startsWith: 'e2e-' } } });
    await prisma.minecraftVersion.deleteMany({ where: { version: { in: ['1.22', '1.77'] } } });
  });

  /** Requête d'un serveur (la CI) : pas d'en-tête Origin, et sa propre adresse IP pour la limite de requêtes. */
  function ci(method: 'put' | 'post', path: string, token: string | null = TOKEN) {
    nextIp += 1;
    const req = request(app.getHttpServer())[method](path).set('X-Forwarded-For', `198.51.100.${(nextIp % 250) + 1}`);
    return token === null ? req : req.set('Authorization', `Bearer ${token}`);
  }

  const createRelease = (slug = 'tag', version = 'e2e-1', body: object = {}) =>
    ci('put', `/api/admin/releases/${slug}/${version}`).send(body);

  function upload(
    slug: string,
    version: string,
    file: Buffer | null,
    fields: Record<string, string> = { edition: 'FREE', minecraft: '1.21.4' },
    fileName = 'tag-free-e2e-1.jar',
  ) {
    const req = ci('post', `/api/admin/releases/${slug}/${version}/files`);
    for (const [name, value] of Object.entries(fields)) req.field(name, value);
    if (file) req.attach('file', file, fileName);
    return req;
  }

  const filesOnDisk = async () => (await readdir(dir, { recursive: true })).filter((entry) => entry.includes('.'));

  describe('authentification par jeton', () => {
    it.each([
      ['sans jeton', null],
      ['avec un mauvais jeton', 'pas-le-bon-jeton-pas-le-bon-jeton-pas-le-bon'],
      ['avec le début du bon jeton', TOKEN.slice(0, 40)],
      ['avec le bon jeton suivi d’un caractère', `${TOKEN}x`],
    ])('refuse %s (les deux routes)', async (_label, token) => {
      await ci('put', '/api/admin/releases/tag/e2e-1', token).send({}).expect(401);
      await ci('post', '/api/admin/releases/tag/e2e-1/files', token).expect(401);
      expect(await prisma.release.count({ where: { version: 'e2e-1' } })).toBe(0);
    });

    it('refuse un autre schéma d’authentification que Bearer', async () => {
      nextIp += 1;
      await request(app.getHttpServer())
        .put('/api/admin/releases/tag/e2e-1')
        .set('Authorization', `Basic ${TOKEN}`)
        .set('X-Forwarded-For', `198.51.100.${nextIp}`)
        .send({})
        .expect(401);
    });

    it('un envoi refusé n’écrit rien sur le disque', async () => {
      await createRelease();
      await upload('tag', 'e2e-1', makePluginJar()).set('Authorization', 'Bearer faux').expect(401);
      expect(await filesOnDisk()).toEqual([]);
    });

    it('ne demande pas d’en-tête Origin (appel de serveur à serveur), contrairement au reste de l’API', async () => {
      await createRelease().expect(201);
      // Une requête de navigateur qui modifie des données sans Origin reste refusée.
      await newBrowser(app).post('/api/auth/login', { email: 'a@b.fr', password: 'x' }, { origin: null }).expect(403);
    });
  });

  describe('PUT /api/admin/releases/:product/:version', () => {
    it('crée la version (201) puis la met à jour (200) sans doublon', async () => {
      const created = await createRelease('tag', 'e2e-1', { changelog: 'Première', channel: 'BETA' }).expect(201);
      expect(created.body).toMatchObject({ product: 'tag', version: 'e2e-1', channel: 'BETA', created: true });

      const updated = await createRelease('tag', 'e2e-1', { changelog: 'Corrigée' }).expect(200);
      expect(updated.body).toMatchObject({ created: false, channel: 'BETA' });
      const rows = await prisma.release.findMany({ where: { version: 'e2e-1' } });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.changelog).toBe('Corrigée');
    });

    it('404 pour un plugin inconnu', async () => {
      await createRelease('nexiste-pas').expect(404);
    });

    it.each(['-x', 'a b', 'x'.repeat(65), 'a;b', '..'])('400 pour la version %j', async (version) => {
      await createRelease('tag', encodeURIComponent(version)).expect((res) => {
        expect([400, 404]).toContain(res.status);
      });
      expect(await prisma.release.count({ where: { version } })).toBe(0);
    });

    it('400 pour un canal ou un champ inconnu', async () => {
      await createRelease('tag', 'e2e-1', { channel: 'NIGHTLY' }).expect(400);
      await createRelease('tag', 'e2e-1', { autre: 1 }).expect(400);
    });
  });

  describe('POST /api/admin/releases/:product/:version/files', () => {
    it('publie un jar : empreinte et taille calculées par le serveur, fichier sur le disque', async () => {
      await createRelease('tag', 'e2e-1', { changelog: 'Notes' });
      const jar = makePluginJar('a');
      const res = await upload('tag', 'e2e-1', jar, { edition: 'PREMIUM', minecraft: '1.21.4, 1.21.5' }, 'tag-premium-e2e-1.jar').expect(201);
      const body = res.body as ReleaseFileResponse;
      expect(body).toMatchObject({
        edition: 'PREMIUM',
        platform: 'PAPER',
        fileName: 'tag-premium-e2e-1.jar',
        sizeBytes: jar.length,
        sha256: createHash('sha256').update(jar).digest('hex'),
        minecraftVersions: ['1.21.5', '1.21.4'],
        release: { version: 'e2e-1', changelog: 'Notes' },
      });
      expect(Buffer.compare(await readFile(join(dir, 'tag/e2e-1/tag-premium-e2e-1.jar')), jar)).toBe(0);
    });

    it('le fichier publié apparaît dans le catalogue public et se télécharge à l’identique', async () => {
      await createRelease();
      const jar = makePluginJar('b');
      await upload('tag', 'e2e-1', jar).expect(201);

      const listed = (await newBrowser(app).get('/api/products/tag/files').expect(200)).body as ReleaseFileResponse[];
      const file = listed.find((f) => f.release.version === 'e2e-1');
      expect(file?.sha256).toBe(createHash('sha256').update(jar).digest('hex'));
      expect((await newBrowser(app).get('/api/products/tag/minecraft-versions').expect(200)).body).toContain('1.21.4');

      const download = await newBrowser(app)
        .get(file?.downloadUrl ?? '')
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(Buffer.compare(download.body as Buffer, jar)).toBe(0);
    });

    it('crée une version de Minecraft inconnue et la trie au bon endroit', async () => {
      await createRelease();
      await upload('tag', 'e2e-1', makePluginJar(), { edition: 'FREE', minecraft: '1.22,1.21.4' }).expect(201);
      const versions = (await newBrowser(app).get('/api/products/tag/minecraft-versions').expect(200)).body as string[];
      expect(versions).toEqual(['1.22', '1.21.4']);
      const created = await prisma.minecraftVersion.findUniqueOrThrow({ where: { version: '1.22' } });
      expect(created.sortOrder).toBe(12200);
    });

    it('404 si la version du plugin n’a pas été créée', async () => {
      await upload('tag', 'e2e-absente', makePluginJar()).expect(404);
      expect(await filesOnDisk()).toEqual([]);
    });

    it('la version publiée d’un plugin à un seul jar est UNIVERSAL, et seulement elle', async () => {
      await createRelease('bedwars', 'e2e-1');
      await upload('bedwars', 'e2e-1', makePluginJar(), { edition: 'FREE', minecraft: '1.21.4' }, 'bw.jar').expect(400);
      await upload('bedwars', 'e2e-1', makePluginJar(), { edition: 'UNIVERSAL', minecraft: '1.21.4' }, 'bw.jar').expect(201);
    });

    it('un plugin à deux jars ne publie pas UNIVERSAL', async () => {
      await createRelease();
      await upload('tag', 'e2e-1', makePluginJar(), { edition: 'UNIVERSAL', minecraft: '1.21.4' }).expect(400);
    });

    describe('fichiers refusés (rien n’est écrit, aucune version de Minecraft n’est créée)', () => {
      const cases: [string, () => Buffer | null, Record<string, string>, string, number][] = [
        ['du texte au lieu d’un jar', () => Buffer.from('#!/bin/sh\necho pas un jar'), { edition: 'FREE', minecraft: '1.77' }, 'tag-free-e2e-1.jar', 422],
        ['un zip sans plugin.yml', () => makeZip({ 'readme.txt': 'x' }), { edition: 'FREE', minecraft: '1.77' }, 'tag-free-e2e-1.jar', 422],
        ['un plugin.yml dans un sous-dossier', () => makeZip({ 'dossier/plugin.yml': 'x' }), { edition: 'FREE', minecraft: '1.77' }, 'tag-free-e2e-1.jar', 422],
        ['un nom avec des espaces', () => makePluginJar(), { edition: 'FREE', minecraft: '1.77' }, 'mon plugin.jar', 400],
        ['une extension qui n’est pas .jar', () => makePluginJar(), { edition: 'FREE', minecraft: '1.77' }, 'plugin.exe', 400],
        ['un nom qui commence par un point', () => makePluginJar(), { edition: 'FREE', minecraft: '1.77' }, '.hidden.jar', 400],
        ['pas de fichier', () => null, { edition: 'FREE', minecraft: '1.77' }, 'x.jar', 400],
        ['pas d’édition', () => makePluginJar(), { minecraft: '1.77' }, 'tag-free-e2e-1.jar', 400],
        ['une édition inconnue', () => makePluginJar(), { edition: 'GOLD', minecraft: '1.77' }, 'tag-free-e2e-1.jar', 400],
        ['pas de version de Minecraft', () => makePluginJar(), { edition: 'FREE' }, 'tag-free-e2e-1.jar', 400],
        ['une version de Minecraft mal formée', () => makePluginJar(), { edition: 'FREE', minecraft: '1.77;drop' }, 'tag-free-e2e-1.jar', 400],
        ['trop de versions de Minecraft', () => makePluginJar(), { edition: 'FREE', minecraft: Array.from({ length: 31 }, (_, i) => `1.${i}`).join(',') }, 'tag-free-e2e-1.jar', 400],
        ['un champ inconnu', () => makePluginJar(), { edition: 'FREE', minecraft: '1.77', sha256: 'a'.repeat(64) }, 'tag-free-e2e-1.jar', 400],
        ['un fichier trop gros (limite de 1 Mo en test)', () => Buffer.concat([makePluginJar(), Buffer.alloc(2 * 1024 * 1024)]), { edition: 'FREE', minecraft: '1.77' }, 'tag-free-e2e-1.jar', 413],
      ];

      it.each(cases)('%s', async (_label, file, fields, fileName, status) => {
        await createRelease();
        await upload('tag', 'e2e-1', file(), fields, fileName).expect(status);
        expect(await filesOnDisk()).toEqual([]);
        expect(await prisma.releaseFile.count({ where: { release: { version: 'e2e-1' } } })).toBe(0);
        expect(await prisma.minecraftVersion.count({ where: { version: '1.77' } })).toBe(0);
      });
    });

    it('409 pour un fichier déjà publié, sans écraser le premier', async () => {
      await createRelease();
      const first = makePluginJar('premier');
      await upload('tag', 'e2e-1', first).expect(201);
      await upload('tag', 'e2e-1', makePluginJar('second')).expect(409);
      expect(Buffer.compare(await readFile(join(dir, 'tag/e2e-1/tag-free-e2e-1.jar')), first)).toBe(0);
      expect(await filesOnDisk()).toEqual(['tag/e2e-1/tag-free-e2e-1.jar']);
    });

    it('5 envois simultanés du même fichier : un seul est publié, les autres reçoivent 409', async () => {
      await createRelease();
      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) => upload('tag', 'e2e-1', makePluginJar(`course-${i}`))),
      );
      const statuses = results.map((r) => r.status).sort((a, b) => a - b);
      expect(statuses).toEqual([201, 409, 409, 409, 409]);
      expect(await prisma.releaseFile.count({ where: { release: { version: 'e2e-1' } } })).toBe(1);
      // Ni fichier temporaire oublié, ni fichier qui n'est pas celui de la ligne en base.
      const row = await prisma.releaseFile.findFirstOrThrow({ where: { release: { version: 'e2e-1' } } });
      const onDisk = await readFile(join(dir, 'tag/e2e-1/tag-free-e2e-1.jar'));
      expect(createHash('sha256').update(onDisk).digest('hex')).toBe(row.sha256);
      expect((await readdir(join(dir, 'tag/e2e-1'))).filter((name) => name.startsWith('.upload-'))).toEqual([]);
    });
  });
});
