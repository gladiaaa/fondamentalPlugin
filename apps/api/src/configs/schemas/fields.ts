import type {
  ConfigBooleanField,
  ConfigField,
  ConfigListField,
  ConfigMapField,
  ConfigNumberField,
  ConfigSectionField,
  ConfigSelectField,
  ConfigTextField,
  ConfigTextListField,
} from '@fondamental/shared';

/** Petites fabriques pour écrire les schémas sans répéter `kind` et les options courantes. */

type Extra<T> = Omit<T, 'kind' | 'key' | 'label'>;

export const text = (key: string, label: string, extra: Extra<ConfigTextField> = {}): ConfigTextField => ({
  kind: 'text',
  key,
  label,
  ...extra,
});

/** Texte MiniMessage (couleurs, dégradés). */
export const mm = (key: string, label: string, extra: Extra<ConfigTextField> = {}): ConfigTextField =>
  text(key, label, { minimessage: true, ...extra });

export const int = (key: string, label: string, extra: Extra<ConfigNumberField> = {}): ConfigNumberField => ({
  kind: 'number',
  key,
  label,
  integer: true,
  ...extra,
});

export const decimal = (key: string, label: string, extra: Extra<ConfigNumberField> = {}): ConfigNumberField => ({
  kind: 'number',
  key,
  label,
  ...extra,
});

export const bool = (key: string, label: string, extra: Extra<ConfigBooleanField> = {}): ConfigBooleanField => ({
  kind: 'boolean',
  key,
  label,
  ...extra,
});

export const select = (
  key: string,
  label: string,
  options: Array<string | { value: string; label: string; premium?: boolean }>,
  extra: Omit<Extra<ConfigSelectField>, 'options'> = {},
): ConfigSelectField => ({
  kind: 'select',
  key,
  label,
  options: options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
  ...extra,
});

export const lines = (key: string, label: string, extra: Extra<ConfigTextListField> = {}): ConfigTextListField => ({
  kind: 'textList',
  key,
  label,
  ...extra,
});

export const section = (key: string, label: string, fields: ConfigField[], extra: Omit<Extra<ConfigSectionField>, 'fields'> = {}): ConfigSectionField => ({
  kind: 'section',
  key,
  label,
  fields,
  ...extra,
});

export const map = (key: string, label: string, extra: Extra<ConfigMapField>): ConfigMapField => ({
  kind: 'map',
  key,
  label,
  ...extra,
});

export const list = (key: string, label: string, extra: Extra<ConfigListField>): ConfigListField => ({
  kind: 'list',
  key,
  label,
  ...extra,
});

// ─── Formats courants ───────────────────────────────────────────

/** Nom de matériau Minecraft (`DIAMOND`, `NETHER_STAR`…). */
export const MATERIAL = '^[A-Z0-9_]+$';
/** Identifiant YAML simple : lettres, chiffres, `_` et `-`. */
export const ID = '^[A-Za-z0-9_-]{1,64}$';
/** Couleur hexadécimale `#RRGGBB`. */
export const HEX = '^#[0-9A-Fa-f]{6}$';
/** Durée : `30m`, `12h`, `7d`, `1w`, `1d12h`… (vide = permanent). */
export const DURATION = '^([0-9]+[smhdwj])+$';

export const material = (key: string, label: string, extra: Extra<ConfigTextField> = {}): ConfigTextField =>
  text(key, label, { pattern: MATERIAL, placeholder: 'DIAMOND', ...extra });

/** La section `license:` commune aux quatre plugins. */
export const licenseSection = (): ConfigSectionField =>
  section('license', 'Licence', [
    { kind: 'license', key: 'key', label: 'Clé de licence', help: 'Remplie automatiquement avec votre clé.' },
    int('check-interval-hours', 'Vérification toutes les… (heures)', { min: 1, max: 168 }),
    int('grace-hours', 'Tolérance hors ligne (heures)', { min: 0, max: 720 }),
  ]);

/** La charte de couleurs `colors:` (balises <texte>, <fort>…). */
export const colorsSection = (): ConfigSectionField =>
  section('colors', 'Couleurs des messages', [
    text('texte', 'Texte courant <texte>', { pattern: HEX }),
    text('fort', 'Noms, nombres, valeurs <fort>', { pattern: HEX }),
    text('accent', 'Actions, commandes <accent>', { pattern: HEX }),
    text('discret', 'Séparateurs, états vides <discret>', { pattern: HEX }),
    text('ok', 'Succès <ok>', { pattern: HEX }),
    text('erreur', 'Erreur <erreur>', { pattern: HEX }),
    text('alerte', 'Avertissement <alerte>', { pattern: HEX }),
    text('info', 'Information <info>', { pattern: HEX }),
    lines('degrade', 'Dégradé des titres <degrade>', { pattern: HEX, maxItems: 5 }),
  ]);

/** Accès MySQL (champs communs). */
export const mysqlFields = (userKey: 'username' | 'user' = 'username'): ConfigField[] => [
  text('host', 'Hôte'),
  int('port', 'Port', { min: 1, max: 65535 }),
  text('database', 'Base'),
  text(userKey, 'Utilisateur'),
  text('password', 'Mot de passe', { help: 'Écrit tel quel dans le fichier généré.' }),
];

/** Range des champs sous un même intertitre du formulaire (sans effet sur le YAML). */
export const grouped = (group: string, fields: ConfigField[]): ConfigField[] => fields.map((f) => ({ ...f, group }));
