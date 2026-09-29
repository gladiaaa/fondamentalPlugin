import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  ConfigPluginResponse,
  ConfigSchemaResponse,
  ConfigValues,
  RenderedConfigResponse,
  SavedConfigResponse,
} from '@fondamental/shared';
import type { SavedConfig } from '../generated/prisma/client.js';
import { LicenseServerClient } from '../licenses/license-server-client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { extractDefaults, renderConfig, walkValues, type ConfigError } from './config-engine.js';
import { CONFIG_REGISTRY, findConfigFile, readTemplate, type ConfigFileDefinition } from './config-registry.js';
import { MAX_SAVED_CONFIGS, MESSAGES } from './configs.constants.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ConfigTarget {
  slug: string;
  version: string;
  file: string;
}

@Injectable()
export class ConfigsService {
  private readonly logger = new Logger(ConfigsService.name);
  private readonly defaults = new Map<string, ConfigValues>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseServer: LicenseServerClient,
  ) {}

  // ─── Public : fichiers et schémas ─────────────────────────────

  plugin(slug: string): ConfigPluginResponse {
    const versions = CONFIG_REGISTRY[slug];
    if (!versions) this.notFound();
    return {
      slug,
      versions: versions.map((v) => ({
        version: v.version,
        files: v.files.map(({ file, label, description }) => ({ file, label, description })),
      })),
    };
  }

  schema(target: ConfigTarget): ConfigSchemaResponse {
    const def = this.definition(target);
    return {
      slug: target.slug,
      version: target.version,
      file: def.file,
      label: def.label,
      description: def.description,
      fields: def.fields,
      defaults: this.defaultsOf(target, def),
    };
  }

  // ─── Acheteurs : rendu et configurations enregistrées ─────────

  /** Le fichier YAML complet, avec la clé de licence de l'acheteur. */
  async render(userId: string, target: ConfigTarget, values: unknown): Promise<RenderedConfigResponse> {
    const def = this.definition(target);
    const key = await this.buyerKey(userId, target.slug);
    const valid = this.validate(def, values);
    const name = (await this.prisma.product.findUnique({ where: { slug: target.slug }, select: { name: true } }))?.name;
    const date = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
    const header = `Généré sur fondamentalplugin.fr le ${date} pour ${name ?? target.slug} ${target.version}. Contient votre clé de licence : ne la partagez pas.`;
    return { file: def.file, yaml: renderConfig(def.fields, readTemplate(target.slug, target.version, def.file), valid, key, header) };
  }

  async list(userId: string): Promise<SavedConfigResponse[]> {
    const rows = await this.prisma.savedConfig.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
    return rows.map(toResponse);
  }

  async create(userId: string, target: ConfigTarget, name: string, values: unknown): Promise<SavedConfigResponse> {
    const def = this.definition(target);
    await this.buyerKey(userId, target.slug);
    const valid = this.validate(def, values);
    if ((await this.prisma.savedConfig.count({ where: { userId } })) >= MAX_SAVED_CONFIGS) {
      throw new BadRequestException({ code: 'CONFIG_LIMIT', message: MESSAGES.limit });
    }
    const row = await this.prisma.savedConfig.create({
      data: { userId, name, productSlug: target.slug, version: target.version, file: def.file, values: valid },
    });
    return toResponse(row);
  }

  async get(userId: string, id: string): Promise<SavedConfigResponse> {
    return toResponse(await this.owned(userId, id));
  }

  async update(userId: string, id: string, name: string, values: unknown): Promise<SavedConfigResponse> {
    const row = await this.owned(userId, id);
    const target = { slug: row.productSlug, version: row.version, file: row.file };
    await this.buyerKey(userId, target.slug);
    const valid = this.validate(this.definition(target), values);
    return toResponse(await this.prisma.savedConfig.update({ where: { id }, data: { name, values: valid } }));
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.owned(userId, id);
    await this.prisma.savedConfig.delete({ where: { id } });
  }

  /**
   * Passe une configuration enregistrée à une autre version du plugin : les valeurs encore valides
   * sont gardées, les autres sont abandonnées (le fichier de la nouvelle version les fournit).
   */
  async upgrade(userId: string, id: string, version: string): Promise<SavedConfigResponse> {
    const row = await this.owned(userId, id);
    const def = this.definition({ slug: row.productSlug, version, file: row.file });
    await this.buyerKey(userId, row.productSlug);
    const { values } = walkValues(def.fields, row.values, 'lenient');
    const kept = walkValues(def.fields, values, 'strict');
    return toResponse(await this.prisma.savedConfig.update({ where: { id }, data: { version, values: kept.values } }));
  }

  // ─── Interne ──────────────────────────────────────────────────

  private definition(target: ConfigTarget): ConfigFileDefinition {
    const def = findConfigFile(target.slug, target.version, target.file);
    if (!def) this.notFound();
    return def;
  }

  private defaultsOf(target: ConfigTarget, def: ConfigFileDefinition): ConfigValues {
    const id = `${target.slug}/${target.version}/${def.file}`;
    let values = this.defaults.get(id);
    if (!values) {
      values = extractDefaults(def.fields, readTemplate(target.slug, target.version, def.file)).values;
      this.defaults.set(id, values);
    }
    return values;
  }

  private validate(def: ConfigFileDefinition, values: unknown): ConfigValues {
    const result = walkValues(def.fields, values, 'strict');
    if (result.errors.length > 0) {
      throw new BadRequestException({
        code: 'CONFIG_INVALID',
        message: result.errors.slice(0, 20).map((e: ConfigError) => `${e.path} : ${e.message}`),
      });
    }
    return result.values;
  }

  /**
   * Clé de licence la plus récente du compte pour ce plugin, ou 403 : le générateur est réservé aux
   * acheteurs. Une licence rattachée avant que son plugin ne soit enregistré est complétée ici, en
   * demandant son produit au serveur de licences.
   */
  private async buyerKey(userId: string, slug: string): Promise<string> {
    const license = await this.prisma.license.findFirst({
      where: { userId, product: { slug } },
      orderBy: { claimedAt: 'desc' },
      select: { licenseKey: true },
    });
    if (license) return license.licenseKey;

    const unknown = await this.prisma.license.findMany({ where: { userId, productId: null }, select: { id: true, licenseKey: true } });
    if (unknown.length > 0 && this.licenseServer.isConfigured) {
      for (const row of unknown) {
        try {
          const status = await this.licenseServer.get(row.licenseKey);
          const product = await this.prisma.product.findUnique({ where: { licenseProduct: status.product }, select: { id: true, slug: true } });
          if (!product) continue;
          await this.prisma.license.update({ where: { id: row.id }, data: { productId: product.id } });
          if (product.slug === slug && !status.revoked) return row.licenseKey;
        } catch (error) {
          this.logger.warn(`Produit d'une licence rattachée introuvable (${(error as Error).name})`);
        }
      }
    }
    throw new ForbiddenException({ code: 'CONFIG_NOT_BUYER', message: MESSAGES.notBuyer });
  }

  private async owned(userId: string, id: string): Promise<SavedConfig> {
    if (!UUID.test(id)) this.notFound();
    const row = await this.prisma.savedConfig.findUnique({ where: { id } });
    if (!row || row.userId !== userId) this.notFound();
    return row;
  }

  private notFound(): never {
    throw new NotFoundException({ code: 'CONFIG_NOT_FOUND', message: MESSAGES.notFound });
  }
}

function toResponse(row: SavedConfig): SavedConfigResponse {
  return {
    id: row.id,
    name: row.name,
    slug: row.productSlug,
    version: row.version,
    file: row.file,
    values: row.values as ConfigValues,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
