import type { ConfigField, ConfigValue, ConfigValues } from "@fondamental/shared";

/** Petits utilitaires immuables pour les valeurs du formulaire (même forme que le YAML). */

export const isValues = (v: unknown): v is ConfigValues => typeof v === "object" && v !== null && !Array.isArray(v);

/** Copie de `values` avec `key` remplacé ; `undefined` retire la clé (la valeur livrée s'applique). */
export function withKey(values: ConfigValues, key: string, value: ConfigValue | undefined): ConfigValues {
  const next = { ...values };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
}

/** Le champ `showIf` est-il satisfait par ses voisins ? */
export function isShown(field: ConfigField, siblings: ConfigValues): boolean {
  if (!field.showIf) return true;
  return siblings[field.showIf.key] === field.showIf.equals;
}

/** Forme d'un champ `oneOf` qui correspond à une valeur existante. */
export function matchingOption(field: Extract<ConfigField, { kind: "oneOf" }>, value: ConfigValue | undefined): number {
  const index = field.options.findIndex(({ field: f }) => {
    if (value === undefined) return false;
    if (f.kind === "number") return typeof value === "number";
    if (f.kind === "select") return typeof value === "string";
    if (f.kind === "text") return typeof value === "string";
    if (f.kind === "boolean") return typeof value === "boolean";
    if (f.kind === "textList" || f.kind === "list") return Array.isArray(value);
    return isValues(value);
  });
  return index === -1 ? 0 : index;
}

/** Valeur par défaut d'une forme `oneOf` quand l'utilisateur en change. */
export function optionDefault(field: ConfigField): ConfigValue {
  switch (field.kind) {
    case "number":
      return field.min ?? 1;
    case "select":
      return field.options[0]?.value ?? "";
    case "boolean":
      return false;
    case "textList":
    case "list":
      return [];
    case "text":
      return "";
    default:
      return {};
  }
}
