import type { INestApplication } from '@nestjs/common';
import type { Response } from 'superagent';
import type { ReleaseFileResponse } from '@fondamental/shared';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DownloadsController } from '../src/releases/downloads.controller.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, InMemoryMailer, newBrowser } from './support/app.js';

// Les 4 plugins et les versions de Minecraft viennent des migrations. Ces tests créent leurs propres
// versions de plugin (préfixe `e2e-`) et un dossier temporaire de fichiers : ils ne touchent à rien d'autre.
const JAR_CONTENT = Buffer.from('PK\x03\x04 faux jar pour les tests');
const OTHER_CONTENT = Buffer.from('PK\x03\x04 autre faux jar');

function binary(res: Response, callback: (error: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('Fichiers et téléchargements (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  // Dossier temporaire fixé par vitest.config.e2e.ts (la configuration de l'API est lue à l'import).
  const dir = process.env['RELEASES_DIR'] as string;

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
    // Chaque test repart d'un dossier de fichiers vide.
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    await prisma.release.deleteMany({ where: { version: { startsWith: 'e2e-' } } });
    await prisma.product.deleteMany({ where: { slug: { startsWith: 'e2e-' } } });
  });

  async function product(slug: string) {
    return prisma.product.findUniqueOrThrow({ where: { slug } });
  }

  /** Crée une version de plugin avec un fichier (écrit sur le disque sauf `onDisk: false`). */
  async function publish(options: {
    slug?: string;
    version: string;
    edition?: 'UNIVERSAL' | 'FREE' | 'PREMIUM';
    minecraft: string[];
    releasedAt?: Date;
    content?: Buffer;
    onDisk?: boolean;
    storagePath?: string;
    fileName?: string;
    productId?: string;
  }) {
    const { slug = 'tag', version, edition = 'FREE', minecraft, content = JAR_CONTENT, onDisk = true } = options;
    const owner = options.productId ?? (await product(slug)).id;
    const fileName = options.fileName ?? `${slug}-${edition.toLowerCase()}-${version}.jar`;
    const storagePath = options.storagePath ?? `${slug}/${version}/${fileName}`;
    if (onDisk) {
      await mkdir(join(dir, slug, version), { recursive: true });
      await writeFile(join(dir, slug, version, fileName), content);
    }
    const versions = await prisma.minecraftVersion.findMany({ where: { version: { in: minecraft } } });
    const release = await prisma.release.upsert({
      where: { productId_version: { productId: owner, version } },
      create: { productId: owner, version, changelog: `Notes ${version}`, releasedAt: options.releasedAt ?? new Date() },
      update: {},
    });
    return prisma.releaseFile.create({
      data: {
        releaseId: release.id,
        edition,
        fileName,
        sizeBytes: content.length,
        sha256: createHash('sha256').update(content).digest('hex'),
        storagePath,
        minecraftVersions: { connect: versions.map((v) => ({ id: v.id })) },
      },
    });
  }

  const get = (path: string) => newBrowser(app).get(path);

  describe('GET /api/products/:slug/minecraft-versions', () => {
    it('est vide tant qu’aucun fichier n’est publié', async () => {
      const res = await get('/api/products/tag/minecraft-versions').expect(200);
      expect(res.body).toEqual([]);
    });

    it('liste les versions qui ont un fichier, de la plus récente à la plus ancienne', async () => {
      await publish({ version: 'e2e-1', minecraft: ['1.21.4', '1.21.8'] });
      await publish({ version: 'e2e-2', minecraft: ['1.21.11'] });
      const res = await get('/api/products/tag/minecraft-versions').expect(200);
      expect(res.body).toEqual(['1.21.11', '1.21.8', '1.21.4']);
    });

    it('ne montre que les versions des fichiers du plugin demandé', async () => {
      await publish({ slug: 'crate', version: 'e2e-1', minecraft: ['1.21.5'] });
      const res = await get('/api/products/tag/minecraft-versions').expect(200);
      expect(res.body).toEqual([]);
    });

    it('404 pour un plugin inconnu', async () => {
      await get('/api/products/nexiste-pas/minecraft-versions').expect(404);
    });
  });

  describe('GET /api/products/:slug/files', () => {
    it('renvoie les fichiers, du plus récent au plus ancien, avec version, édition, taille et SHA-256', async () => {
      await publish({ version: 'e2e-old', minecraft: ['1.21.4'], releasedAt: new Date('2026-01-01') });
      await publish({ version: 'e2e-new', minecraft: ['1.21.4'], releasedAt: new Date('2026-06-01') });
      const res = await get('/api/products/tag/files').expect(200);
      const files = res.body as ReleaseFileResponse[];
      expect(files.map((f) => f.release.version)).toEqual(['e2e-new', 'e2e-old']);
      expect(files[0]).toMatchObject({
        edition: 'FREE',
        platform: 'PAPER',
        fileName: 'tag-free-e2e-new.jar',
        sizeBytes: JAR_CONTENT.length,
        sha256: createHash('sha256').update(JAR_CONTENT).digest('hex'),
        minecraftVersions: ['1.21.4'],
        downloadCount: 0,
        release: { version: 'e2e-new', channel: 'RELEASE', changelog: 'Notes e2e-new' },
      });
      expect(files[0]?.downloadUrl).toBe(`/api/downloads/${files[0]?.id}`);
    });

    it('un plugin à deux jars renvoie le Free et le Premium de la même version', async () => {
      await publish({ version: 'e2e-1', edition: 'FREE', minecraft: ['1.21.4'] });
      await publish({ version: 'e2e-1', edition: 'PREMIUM', minecraft: ['1.21.4'] });
      const files = (await get('/api/products/tag/files').expect(200)).body as ReleaseFileResponse[];
      expect(files.map((f) => f.edition).sort()).toEqual(['FREE', 'PREMIUM']);
    });

    it('filtre par version de Minecraft', async () => {
      await publish({ version: 'e2e-a', minecraft: ['1.21.4'] });
      await publish({ version: 'e2e-b', minecraft: ['1.21.8', '1.21.11'] });
      const only = async (minecraft: string) =>
        ((await get(`/api/products/tag/files?minecraft=${minecraft}`).expect(200)).body as ReleaseFileResponse[]).map(
          (f) => f.release.version,
        );
      expect(await only('1.21.4')).toEqual(['e2e-a']);
      expect(await only('1.21.11')).toEqual(['e2e-b']);
      expect(await only('1.21.6')).toEqual([]);
    });

    it('trie les versions de Minecraft d’un fichier de la plus récente à la plus ancienne', async () => {
      await publish({ version: 'e2e-1', minecraft: ['1.21.4', '1.21.11', '1.21.8'] });
      const files = (await get('/api/products/tag/files').expect(200)).body as ReleaseFileResponse[];
      expect(files[0]?.minecraftVersions).toEqual(['1.21.11', '1.21.8', '1.21.4']);
    });

    it('refuse une version de Minecraft mal formée et les paramètres inconnus', async () => {
      await get('/api/products/tag/files?minecraft=../etc').expect(400);
      await get('/api/products/tag/files?minecraft=1.21.4;drop').expect(400);
      await get('/api/products/tag/files?autre=1').expect(400);
    });

    it('404 pour un plugin inconnu ou retiré de la vente', async () => {
      await get('/api/products/nexiste-pas/files').expect(404);
      const hidden = await prisma.product.create({
        data: {
          slug: 'e2e-cache',
          name: 'Caché',
          description: 'x',
          licenseProduct: 'e2e-cache',
          distribution: 'SINGLE_JAR',
          requirements: { platform: 'Paper', java: 21, dependencies: [] },
          active: false,
        },
      });
      await publish({ slug: 'e2e-cache', productId: hidden.id, version: 'e2e-1', minecraft: ['1.21.4'] });
      await get('/api/products/e2e-cache/files').expect(404);
    });

    it('ne laisse fuiter ni le chemin de stockage ni le dossier du serveur', async () => {
      await publish({ version: 'e2e-1', minecraft: ['1.21.4'] });
      const text = JSON.stringify((await get('/api/products/tag/files').expect(200)).body);
      expect(text).not.toContain('storagePath');
      expect(text).not.toContain(dir);
      expect(text).not.toContain('tag/e2e-1/');
    });
  });

  describe('GET /api/downloads/:fileId', () => {
    it('envoie le jar, sans compte, avec le bon nom et les bons en-têtes', async () => {
      const file = await publish({ version: 'e2e-1', minecraft: ['1.21.4'] });
      const res = await get(`/api/downloads/${file.id}`).buffer(true).parse(binary).expect(200);
      expect(Buffer.compare(res.body as Buffer, JAR_CONTENT)).toBe(0);
      expect(res.headers['content-type']).toContain('application/java-archive');
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename="tag-free-e2e-1\.jar"/);
    });

    it('le fichier reçu correspond au SHA-256 annoncé', async () => {
      const file = await publish({ version: 'e2e-1', minecraft: ['1.21.4'], content: OTHER_CONTENT });
      const res = await get(`/api/downloads/${file.id}`).buffer(true).parse(binary).expect(200);
      expect(createHash('sha256').update(res.body as Buffer).digest('hex')).toBe(file.sha256);
    });

    it('compte chaque téléchargement', async () => {
      const file = await publish({ version: 'e2e-1', minecraft: ['1.21.4'] });
      await get(`/api/downloads/${file.id}`).buffer(true).parse(binary).expect(200);
      await get(`/api/downloads/${file.id}`).buffer(true).parse(binary).expect(200);
      const after = await prisma.releaseFile.findUniqueOrThrow({ where: { id: file.id } });
      expect(after.downloadCount).toBe(2);
    });

    it('compte sans perte 10 téléchargements simultanés', async () => {
      const file = await publish({ version: 'e2e-1', minecraft: ['1.21.4'] });
      await Promise.all(
        Array.from({ length: 10 }, () => get(`/api/downloads/${file.id}`).buffer(true).parse(binary).expect(200)),
      );
      const after = await prisma.releaseFile.findUniqueOrThrow({ where: { id: file.id } });
      expect(after.downloadCount).toBe(10);
    });

    it('404 pour un identifiant inconnu ou qui n’est pas un identifiant', async () => {
      await get('/api/downloads/00000000-0000-4000-8000-000000000000').expect(404);
      await get('/api/downloads/pas-un-uuid').expect(404);
    });

    it('404 si le fichier manque sur le disque, sans compter de téléchargement', async () => {
      const file = await publish({ version: 'e2e-1', minecraft: ['1.21.4'], onDisk: false });
      await get(`/api/downloads/${file.id}`).expect(404);
      const after = await prisma.releaseFile.findUniqueOrThrow({ where: { id: file.id } });
      expect(after.downloadCount).toBe(0);
    });

    it.each(['../../../../etc/passwd', '/etc/passwd', 'tag/../../x.jar'])(
      'refuse un chemin de stockage qui sort du dossier des fichiers : %s',
      async (storagePath) => {
        const file = await publish({ version: 'e2e-1', minecraft: ['1.21.4'], storagePath });
        const res = await get(`/api/downloads/${file.id}`).expect(404);
        expect(JSON.stringify(res.body)).not.toContain('root:');
      },
    );

    it('404 pour le fichier d’un plugin retiré de la vente', async () => {
      const hidden = await prisma.product.create({
        data: {
          slug: 'e2e-cache',
          name: 'Caché',
          description: 'x',
          licenseProduct: 'e2e-cache',
          distribution: 'SINGLE_JAR',
          requirements: { platform: 'Paper', java: 21, dependencies: [] },
          active: false,
        },
      });
      const file = await publish({ slug: 'tag', productId: hidden.id, version: 'e2e-1', minecraft: ['1.21.4'] });
      await get(`/api/downloads/${file.id}`).expect(404);
    });

    it('limite les téléchargements par adresse IP (429)', async () => {
      const file = await publish({ version: 'e2e-1', minecraft: ['1.21.4'] });
      const browser = newBrowser(app);
      for (let i = 0; i < 30; i += 1) {
        await browser.get(`/api/downloads/${file.id}`).buffer(true).parse(binary).expect(200);
      }
      await browser.get(`/api/downloads/${file.id}`).expect(429);
    });
  });

  describe('avec nginx (DOWNLOADS_ACCEL_PREFIX)', () => {
    it('répond par X-Accel-Redirect, sans corps, et compte le téléchargement', async () => {
      // La configuration est lue à l'import : on règle le préfixe directement sur le contrôleur de cette instance.
      const accelApp = await createTestApp(new InMemoryMailer());
      (accelApp.get(DownloadsController) as unknown as { accelPrefix?: string }).accelPrefix = '/protected-releases';
      try {
        const file = await publish({ version: 'e2e-1', minecraft: ['1.21.4'] });
        const res = await newBrowser(accelApp).get(`/api/downloads/${file.id}`).buffer(true).parse(binary).expect(200);
        expect(res.headers['x-accel-redirect']).toBe('/protected-releases/tag/e2e-1/tag-free-e2e-1.jar');
        expect((res.body as Buffer).length).toBe(0);
        expect(res.headers['content-disposition']).toMatch(/^attachment; filename="tag-free-e2e-1\.jar"/);
        const after = await prisma.releaseFile.findUniqueOrThrow({ where: { id: file.id } });
        expect(after.downloadCount).toBe(1);
      } finally {
        await accelApp.close();
      }
    });
  });
});
