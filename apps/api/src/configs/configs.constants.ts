/** Configurations enregistrées par compte. */
export const MAX_SAVED_CONFIGS = 50;

export const MESSAGES = {
  notFound: 'Configuration introuvable.',
  notBuyer: 'Le générateur de configuration est réservé aux détenteurs d’une licence de ce plugin.',
  limit: `${MAX_SAVED_CONFIGS} configurations enregistrées au plus : supprimez-en une.`,
} as const;

/** Formats des paramètres : plugin, version, fichier. */
export const SLUG = /^[a-z0-9-]{1,32}$/;
export const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
export const FILE = /^[a-z0-9-]{1,32}\.yml$/;
