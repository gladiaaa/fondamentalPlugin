import { parseDocument } from 'yaml';
import type { ConfigField } from '@fondamental/shared';
import { CONFIG_REGISTRY, readTemplate } from './config-registry.js';
import { extractDefaults, renderConfig, walkValues } from './config-engine.js';

const files = Object.entries(CONFIG_REGISTRY).flatMap(([slug, versions]) =>
  versions.flatMap(({ version, files: defs }) => defs.map((def) => ({ slug, version, def, id: `${slug} ${version} ${def.file}` }))),
);

const parse = (yaml: string) => parseDocument(yaml, { uniqueKeys: false }).toJS() as Record<string, unknown>;

/** Chemins des champs remplacés d'un bloc au rendu (entrées nommées, listes) : rien ne doit s'y perdre. */
function replacedPaths(fields: ConfigField[], prefix: string[] = []): string[][] {
  return fields.flatMap((f) => {
    const path = [...prefix, f.key];
    if (f.kind === 'section') return replacedPaths(f.fields, path);
    return f.kind === 'map' || f.kind === 'list' || f.kind === 'textList' ? [path] : [];
  });
}

const at = (obj: unknown, path: string[]) =>
  path.reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);

describe('schémas du générateur de configuration', () => {
  it.each(files)('$id : chaque valeur livrée est acceptée par le schéma', ({ slug, version, def }) => {
    const template = readTemplate(slug, version, def.file);
    const { values, errors } = extractDefaults(def.fields, template);
    expect(errors).toEqual([]);
    // Les valeurs livrées doivent aussi passer la validation stricte (celle des valeurs du site).
    expect(walkValues(def.fields, values, 'strict').errors).toEqual([]);
  });

  it.each(files)('$id : le schéma couvre tout ce que le rendu réécrit d’un bloc', ({ slug, version, def }) => {
    const template = readTemplate(slug, version, def.file);
    const { values } = extractDefaults(def.fields, template);
    const raw = parse(template);
    for (const path of replacedPaths(def.fields)) {
      expect(at(values, path), path.join('.')).toEqual(at(raw, path));
    }
  });

  it.each(files)('$id : sans changement, le rendu redonne le fichier livré (hors clé de licence)', ({ slug, version, def }) => {
    const template = readTemplate(slug, version, def.file);
    const { values } = extractDefaults(def.fields, template);
    const rendered = renderConfig(def.fields, template, values, null, 'Généré pour le test');
    expect(parse(rendered)).toEqual(parse(template));
  });
});
