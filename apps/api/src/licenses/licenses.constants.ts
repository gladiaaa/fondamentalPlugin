export const MINUTE = 60_000;

export const THROTTLE = {
  /** Strict : une clé donne accès au produit, il ne faut pas pouvoir en deviner par tâtonnement. */
  claim: { limit: 5, ttl: MINUTE },
} as const;

export const MESSAGES = {
  claimInvalid: 'Clé invalide ou déjà utilisée.',
  serverUnavailable: 'Serveur de licences momentanément indisponible.',
  // Même message qu'une clé qui n'existe pas pour ce compte : ne révèle jamais qu'elle appartient à un autre.
  licenseNotFound: 'Licence introuvable.',
} as const;
