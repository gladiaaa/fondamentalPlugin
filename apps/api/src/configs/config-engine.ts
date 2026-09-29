import { isScalar, isSeq, parseDocument, type Document } from 'yaml';
import type { ConfigField, ConfigValue, ConfigValues } from '@fondamental/shared';

/** Limites par défaut, pour qu'un formulaire ne puisse pas produire un fichier démesuré. */
const MAX_TEXT = 2000;
const MAX_LIST = 100;
const MAX_MAP = 200;

export interface ConfigError {
  /** Chemin YAML du champ, ex. `crates.vote.rewards.diamants.weight`. */
  path: string;
  message: string;
}

type Mode = 'strict' | 'lenient';

interface WalkResult {
  values: ConfigValues;
  errors: ConfigError[];
  /** Mode lenient : chemins présents dans la source mais absents du schéma. */
  unknown: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const join = (path: string, key: string) => (path ? `${path}.${key}` : key);

/**
 * Parcourt `input` selon le schéma et renvoie une copie ne contenant que les champs connus.
 * - `strict` (valeurs envoyées par le site) : toute valeur hors schéma ou invalide est une erreur.
 * - `lenient` (valeurs lues dans le fichier livré avec le plugin) : les nombres écrits comme textes
 *   sont convertis, les chemins inconnus sont listés dans `unknown` (voir les tests des schémas).
 */
export function walkValues(fields: ConfigField[], input: unknown, mode: Mode): WalkResult {
  const result: WalkResult = { values: {}, errors: [], unknown: [] };
  walkSection(fields, input, '', mode, result, result.values);
  return result;
}

function walkSection(
  fields: ConfigField[],
  input: unknown,
  path: string,
  mode: Mode,
  result: WalkResult,
  out: ConfigValues,
): void {
  if (!isObject(input)) {
    if (input !== undefined && input !== null) result.errors.push({ path: path || '(racine)', message: 'objet attendu' });
    return;
  }
  const known = new Set(fields.map((f) => f.key));
  for (const key of Object.keys(input)) {
    if (known.has(key)) continue;
    if (mode === 'strict') result.errors.push({ path: join(path, key), message: 'champ inconnu' });
    else result.unknown.push(join(path, key));
  }
  for (const field of fields) {
    const value = walkField(field, input[field.key], join(path, field.key), mode, result);
    if (value !== undefined) out[field.key] = value;
  }
}

function walkField(field: ConfigField, raw: unknown, path: string, mode: Mode, result: WalkResult): ConfigValue | undefined {
  // La clé de licence n'est jamais lue depuis les valeurs : l'API la remplit au rendu.
  if (field.kind === 'license' || raw === undefined) return undefined;
  const fail = (message: string) => {
    result.errors.push({ path, message });
    return undefined;
  };
  switch (field.kind) {
    case 'text': {
      let v = raw;
      if (mode === 'lenient' && (typeof v === 'number' || typeof v === 'boolean')) v = String(v);
      if (v === null && mode === 'lenient') v = '';
      if (typeof v !== 'string') return fail('texte attendu');
      if (v.length > (field.maxLength ?? MAX_TEXT)) return fail(`${field.maxLength ?? MAX_TEXT} caractères au plus`);
      if (v === '' && field.optional === false) return fail('obligatoire');
      if (v !== '' && field.pattern && !new RegExp(field.pattern).test(v)) return fail('format invalide');
      return v;
    }
    case 'number': {
      let v = raw;
      if (mode === 'lenient' && typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) v = Number(v);
      if (typeof v !== 'number' || !Number.isFinite(v)) return fail('nombre attendu');
      if (field.integer && !Number.isInteger(v)) return fail('nombre entier attendu');
      if (field.min !== undefined && v < field.min) return fail(`au moins ${field.min}`);
      if (field.max !== undefined && v > field.max) return fail(`au plus ${field.max}`);
      return v;
    }
    case 'boolean':
      return typeof raw === 'boolean' ? raw : fail('oui ou non attendu');
    case 'select': {
      const v = mode === 'lenient' && typeof raw === 'number' ? String(raw) : raw;
      if (typeof v !== 'string' || !field.options.some((o) => o.value === v)) return fail('valeur non proposée');
      return v;
    }
    case 'textList': {
      if (!Array.isArray(raw)) return fail('liste attendue');
      if (raw.length > (field.maxItems ?? MAX_LIST)) return fail(`${field.maxItems ?? MAX_LIST} éléments au plus`);
      const items: string[] = [];
      raw.forEach((item: unknown, i) => {
        const v = mode === 'lenient' && typeof item === 'number' ? String(item) : item;
        if (typeof v !== 'string' || v.length > MAX_TEXT) fail(`élément ${i + 1} : texte attendu`);
        else if (field.pattern && !new RegExp(field.pattern).test(v)) fail(`élément ${i + 1} : format invalide`);
        else items.push(v);
      });
      return items;
    }
    case 'section': {
      const out: ConfigValues = {};
      walkSection(field.fields, raw, path, mode, result, out);
      return out;
    }
    case 'map': {
      if (!isObject(raw)) return raw === null && mode === 'lenient' ? {} : fail('objet attendu');
      const keys = Object.keys(raw);
      if (keys.length > (field.maxItems ?? MAX_MAP)) return fail(`${field.maxItems ?? MAX_MAP} ${field.itemLabel}s au plus`);
      const pattern = new RegExp(field.keyPattern);
      const out: ConfigValues = {};
      for (const key of keys) {
        if (!pattern.test(key)) {
          fail(`nom de ${field.itemLabel} invalide : « ${key} »`);
          continue;
        }
        if (field.value) {
          const v = walkField({ ...field.value, key }, raw[key], join(path, key), mode, result);
          if (v !== undefined) out[key] = v;
          continue;
        }
        const entry: ConfigValues = {};
        walkSection(field.fields ?? [], raw[key] ?? {}, join(path, key), mode, result, entry);
        out[key] = entry;
      }
      return out;
    }
    case 'oneOf': {
      for (const option of field.options) {
        const attempt: WalkResult = { values: {}, errors: [], unknown: [] };
        const v = walkField({ ...option.field, key: field.key } as ConfigField, raw, path, mode, attempt);
        if (attempt.errors.length === 0) {
          result.unknown.push(...attempt.unknown);
          return v;
        }
      }
      return fail(`forme attendue : ${field.options.map((o) => o.label).join(' ou ')}`);
    }
    case 'list': {
      if (!Array.isArray(raw)) return raw === null && mode === 'lenient' ? [] : fail('liste attendue');
      if (raw.length > (field.maxItems ?? MAX_LIST)) return fail(`${field.maxItems ?? MAX_LIST} ${field.itemLabel}s au plus`);
      const out: ConfigValues[] = [];
      raw.forEach((item: unknown, i) => {
        const itemPath = `${path}[${i}]`;
        let fields = field.fields ?? [];
        if (field.variants) {
          const discriminator = isObject(item) ? item[field.variants.key] : undefined;
          const option = field.variants.options.find((o) => o.value === discriminator);
          if (!option) return void result.errors.push({ path: join(itemPath, field.variants.key), message: 'type inconnu' });
          fields = [
            { kind: 'select', key: field.variants.key, label: 'Type', options: field.variants.options },
            ...option.fields,
          ];
        }
        const entry: ConfigValues = {};
        walkSection(fields, item, itemPath, mode, result, entry);
        out.push(entry);
      });
      return out;
    }
  }
}

/** Valeurs d'un fichier du plugin, lues dans son YAML livré, réduites au schéma. */
export function extractDefaults(fields: ConfigField[], template: string): WalkResult {
  return walkValues(fields, parseTemplate(template).toJS() ?? {}, 'lenient');
}

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Réécrit le YAML livré avec le plugin : seuls les champs du schéma présents dans `values` changent,
 * tout le reste (commentaires compris) reste tel quel. Une valeur identique à celle du fichier livré
 * n'est pas touchée, pour garder ses commentaires.
 */
export function renderConfig(
  fields: ConfigField[],
  template: string,
  values: ConfigValues,
  licenseKey: string | null,
  header: string,
): string {
  const doc = parseTemplate(template);
  const current = (doc.toJS() ?? {}) as Record<string, unknown>;
  apply(doc, current, fields, values, [], licenseKey);
  doc.commentBefore = doc.commentBefore ? ` ${header}\n\n${doc.commentBefore}` : ` ${header}`;
  return doc.toString({ lineWidth: 0 });
}

function apply(
  doc: Document,
  current: Record<string, unknown> | undefined,
  fields: ConfigField[],
  values: ConfigValues,
  path: string[],
  licenseKey: string | null,
): void {
  for (const field of fields) {
    const fieldPath = [...path, field.key];
    if (field.kind === 'license') {
      if (licenseKey !== null) setValue(doc, fieldPath, licenseKey);
      continue;
    }
    const value = values[field.key];
    const existing = current?.[field.key];
    // Une section est toujours parcourue : elle peut contenir la clé de licence.
    if (field.kind === 'section') {
      apply(doc, isObject(existing) ? existing : undefined, field.fields, (value ?? {}) as ConfigValues, fieldPath, licenseKey);
      continue;
    }
    if (value === undefined) continue;
    if (sameValue(value, existing)) continue;
    setValue(doc, fieldPath, value);
  }
}

/** Un scalaire garde son nœud (style de guillemets, commentaire) ; le reste est remplacé. */
function setValue(doc: Document, path: string[], value: unknown): void {
  const node = doc.getIn(path, true);
  if (isScalar(node) && (typeof value !== 'object' || value === null)) {
    node.value = value;
    return;
  }
  const created = doc.createNode(value);
  if (isSeq(node) && node.flow && isSeq(created) && created.items.every((i) => isScalar(i))) created.flow = true;
  doc.setIn(path, created);
}

/** Certains fichiers livrés répètent une clé (config.yml de Bedwars : deux blocs `matchmaking:`). */
function parseTemplate(template: string): Document {
  return parseDocument(template, { uniqueKeys: false });
}
