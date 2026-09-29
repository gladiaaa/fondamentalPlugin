import { readFileSync } from 'node:fs';
import type { ConfigField } from '@fondamental/shared';
import { bedwarsConfig1_0, crateConfig1_2, passConfig1_3, tagConfig2_1 } from './schemas/config-files.js';
import { crateCrates1_2 } from './schemas/crate.js';
import { passQuests1_3, passSeason1_3 } from './schemas/pass.js';
import { tagTags2_1 } from './schemas/tag.js';

/**
 * Fichiers proposés par le générateur (#30). Chaque fichier part du YAML livré avec cette version du
 * plugin (`templates/<slug>/<version>/<fichier>`, copié tel quel depuis son dépôt) : le formulaire ne
 * change que les champs de son schéma, le reste du fichier et ses commentaires restent intacts.
 *
 * Ajouter une version : copier les fichiers de la release dans `templates/`, puis l'ajouter ici
 * (en tête : la plus récente d'abord). Les tests vérifient que chaque schéma couvre son fichier.
 */
export interface ConfigFileDefinition {
  file: string;
  label: string;
  description: string;
  fields: ConfigField[];
}

export interface ConfigVersionDefinition {
  version: string;
  files: ConfigFileDefinition[];
}

const configYml = (fields: ConfigField[], description: string): ConfigFileDefinition => ({
  file: 'config.yml',
  label: 'Configuration générale',
  description,
  fields,
});

export const CONFIG_REGISTRY: Record<string, ConfigVersionDefinition[]> = {
  bedwars: [
    {
      version: '1.0.0',
      files: [configYml(bedwarsConfig1_0, 'Licence, parties, générateurs, événements, coins, base de données, réseau.')],
    },
  ],
  tag: [
    {
      version: '2.1.0',
      files: [
        configYml(tagConfig2_1, 'Licence, chat, tag au-dessus de la tête, menus, base de données, pack de ressources.'),
        { file: 'tags.yml', label: 'Tags', description: 'Raretés, catégories et tags : apparence, effets, boutique, événements.', fields: tagTags2_1 },
      ],
    },
  ],
  crate: [
    {
      version: '1.2.1',
      files: [
        configYml(crateConfig1_2, 'Licence, comportement, stockage, animation par défaut, couleurs.'),
        { file: 'crates.yml', label: 'Crates', description: 'Raretés et crates : animation, clé, récompenses, pitié, paliers.', fields: crateCrates1_2 },
      ],
    },
  ],
  pass: [
    {
      version: '1.3.0',
      files: [
        configYml(passConfig1_3, 'Licence, serveur, stockage et réseau, temps, boosts, série, achats, couleurs.'),
        { file: 'season.yml', label: 'Saison', description: 'Dates, paliers, pistes gratuite et premium, paliers bonus, classement.', fields: passSeason1_3 },
        { file: 'quests.yml', label: 'Quêtes', description: 'Difficultés, pools et quêtes avec leurs objectifs.', fields: passQuests1_3 },
      ],
    },
  ],
};

export function findConfigFile(slug: string, version: string, file: string): ConfigFileDefinition | undefined {
  return CONFIG_REGISTRY[slug]?.find((v) => v.version === version)?.files.find((f) => f.file === file);
}

const templates = new Map<string, string>();

/** YAML livré avec le plugin (lu une fois, puis gardé en mémoire). */
export function readTemplate(slug: string, version: string, file: string): string {
  const id = `${slug}/${version}/${file}`;
  let content = templates.get(id);
  if (content === undefined) {
    content = readFileSync(new URL(`./templates/${id}`, import.meta.url), 'utf8');
    templates.set(id, content);
  }
  return content;
}
