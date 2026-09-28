const MINUTE = 60_000;

export const THROTTLE = {
  /** Public, envoie un e-mail : même ordre de grandeur que les autres routes publiques qui en envoient. */
  contact: { limit: 5, ttl: MINUTE },
} as const;

export const MESSAGES = {
  mailUnavailable: 'Envoi des e-mails momentanément indisponible. Réessayez plus tard.',
  accepted: 'Votre message a été transmis à l’équipe.',
} as const;
