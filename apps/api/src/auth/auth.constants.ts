const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Durée d'une session (absolue : il faut se reconnecter au bout de 30 jours). */
export const SESSION_TTL_MS = 30 * DAY;
/** Validité du lien de confirmation d'adresse. */
export const VERIFY_EMAIL_TTL_MS = DAY;
/** Validité du lien de réinitialisation de mot de passe. */
export const RESET_PASSWORD_TTL_MS = 30 * MINUTE;
/** Délai minimal entre deux e-mails de même nature pour un même compte (anti-harcèlement par e-mail). */
export const EMAIL_COOLDOWN_MS = MINUTE;

/** Échecs de connexion consécutifs avant blocage du compte. */
export const MAX_FAILED_LOGINS = 5;
/** Les échecs comptent dans cette fenêtre : au-delà, le compteur repart de zéro. */
export const FAILED_LOGIN_WINDOW_MS = 15 * MINUTE;
export const LOCKOUT_MS = 15 * MINUTE;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** Limites par IP et par minute des routes sensibles. */
export const THROTTLE = {
  register: { limit: 5, ttl: MINUTE },
  login: { limit: 10, ttl: MINUTE },
  verifyEmail: { limit: 10, ttl: MINUTE },
  resendVerification: { limit: 3, ttl: MINUTE },
  forgotPassword: { limit: 5, ttl: MINUTE },
  resetPassword: { limit: 10, ttl: MINUTE },
  changePassword: { limit: 5, ttl: MINUTE },
} as const;

export const MESSAGES = {
  invalidCredentials: 'E-mail ou mot de passe incorrect.',
  invalidLink: 'Ce lien est invalide ou a expiré.',
  emailNotVerified: "Confirmez votre adresse e-mail avant de vous connecter : un lien vous a été envoyé à l'inscription.",
  passwordCompromised:
    'Ce mot de passe apparaît dans des fuites de données connues. Choisissez-en un autre.',
  currentPasswordInvalid: 'Le mot de passe actuel est incorrect.',
  noPassword: "Ce compte n'a pas de mot de passe. Utilisez « Mot de passe oublié » pour en définir un.",
  samePassword: "Le nouveau mot de passe doit être différent de l'actuel.",
  mailUnavailable: 'Envoi des e-mails momentanément indisponible. Réessayez plus tard.',
  csrf: 'Requête refusée : jeton anti-CSRF invalide.',
  origin: 'Requête refusée : origine non autorisée.',
  notAuthenticated: 'Vous devez être connecté.',
  /** Réponse identique que l'adresse existe ou non : ne révèle rien. */
  registerAccepted:
    "Si cette adresse peut être utilisée, un e-mail de confirmation vient d'être envoyé.",
  resetAccepted: 'Si un compte existe pour cette adresse, un e-mail vient de lui être envoyé.',
} as const;
