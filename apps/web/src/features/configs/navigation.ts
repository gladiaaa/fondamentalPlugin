import type { ConfigField, ConfigMapField, ConfigValue, ConfigValues } from "@fondamental/shared";
import { isValues } from "./values";

/**
 * Navigation du configurateur dans un fichier : un chemin désigne ce qui est affiché au centre.
 *   []                      → « Général » (champs simples à la racine)
 *   ["license"]             → une section
 *   ["crates"]              → une liste d'entrées nommées
 *   ["crates", "vote"]      → une entrée
 *   ["categories", "grades", "tags", "vip"] → une entrée d'une liste imbriquée
 */
export type NodePath = string[];

export type ResolvedNode =
  | { kind: "general"; fields: ConfigField[] }
  | { kind: "section"; field: Extract<ConfigField, { kind: "section" }>; values: ConfigValues }
  | { kind: "map"; field: ConfigMapField; values: ConfigValues }
  | { kind: "entry"; map: ConfigMapField; key: string; values: ConfigValues };

/** Champs affichés dans « Général » : tout ce qui n'a pas son propre écran. */
export const generalFields = (fields: ConfigField[]) =>
  fields.filter((f) => f.kind !== "section" && !(f.kind === "map" && f.fields));

/** Champs qui ont leur propre écran, dans l'ordre du fichier. */
export const screenFields = (fields: ConfigField[]) =>
  fields.filter((f): f is Extract<ConfigField, { kind: "section" }> | ConfigMapField => f.kind === "section" || (f.kind === "map" && !!f.fields));

export function resolveNode(fields: ConfigField[], values: ConfigValues, path: NodePath): ResolvedNode | null {
  if (path.length === 0) return { kind: "general", fields: generalFields(fields) };
  let currentFields = fields;
  let currentValues: ConfigValues = values;
  let i = 0;
  while (i < path.length) {
    const field = currentFields.find((f) => f.key === path[i]);
    if (!field) return null;
    const value = currentValues[field.key];
    if (field.kind === "section") {
      if (i === path.length - 1) return { kind: "section", field, values: isValues(value) ? value : {} };
      return null;
    }
    if (field.kind !== "map" || !field.fields) return null;
    const entries = isValues(value) ? value : {};
    if (i === path.length - 1) return { kind: "map", field, values: entries };
    const key = path[i + 1];
    const entry = entries[key];
    if (!isValues(entry)) return null;
    if (i + 1 === path.length - 1) return { kind: "entry", map: field, key, values: entry };
    currentFields = field.fields;
    currentValues = entry;
    i += 2;
  }
  return null;
}

/** Copie de `values` avec la valeur au chemin `path` remplacée. */
export function setAt(values: ConfigValues, path: NodePath, value: ConfigValue): ConfigValues {
  if (path.length === 0) return isValues(value) ? value : values;
  const [head, ...rest] = path;
  const child = values[head];
  return { ...values, [head]: rest.length === 0 ? value : setAt(isValues(child) ? child : {}, rest, value) };
}

/** Libellé d'un chemin, pour le fil d'Ariane. */
export function breadcrumb(fields: ConfigField[], path: NodePath): string[] {
  const labels: string[] = [];
  let currentFields = fields;
  for (let i = 0; i < path.length; i += 2) {
    const field = currentFields.find((f) => f.key === path[i]);
    if (!field) break;
    labels.push(field.label);
    if (i + 1 < path.length) labels.push(path[i + 1]);
    currentFields = field.kind === "map" && field.fields ? field.fields : [];
  }
  return labels;
}
