const MINUTE = 60_000;

export const THROTTLE = {
  /** Vérification d'un code TOTP : peu de tentatives, comme toute vérification de code. */
  twoFactorVerify: { limit: 10, ttl: MINUTE },
} as const;

export const MESSAGES = {
  notAdmin: 'Réservé aux administrateurs.',
  twoFactorRequired: 'Validez votre code à deux facteurs pour continuer (POST /admin/2fa/verify).',
  totpSetupRequired: "Aucune configuration 2FA en attente : appelez d'abord POST /admin/2fa/setup.",
  totpInvalidCode: 'Code invalide.',
  totpAlreadyEnabled:
    "La double authentification est déjà activée : saisissez d'abord un code de votre application pour la reconfigurer.",
  orderNotFound: 'Commande introuvable.',
  orderNotPaid: "Cette commande n'a pas encore été payée.",
  licenseNotFound: 'Licence introuvable.',
  licenseServerUnavailable: 'Serveur de licences momentanément indisponible.',
  licenseNoOrder: "Cette licence n'est pas liée à une commande : impossible de la recréer.",
  mailUnavailable: 'Envoi des e-mails momentanément indisponible. Réessayez plus tard.',
  noLicenseYet: "Cette commande n'a pas encore de licence.",
  accountDeleted: "Le compte de cette commande a été supprimé : plus d'adresse à laquelle écrire.",
  productNotFound: 'Produit introuvable.',
  userNotFound: 'Compte introuvable.',
  cannotModifySelf: 'Vous ne pouvez ni bloquer votre propre compte ni changer votre propre rôle.',
  releaseNotFound: 'Version introuvable.',
} as const;
