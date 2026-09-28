/**
 * Chemin de retour après la connexion (`/connexion?retour=/plugins/tag`).
 * Seulement un chemin interne au site : `//exemple.com` ou `/\exemple.com`
 * seraient compris par le navigateur comme un autre domaine (redirection
 * ouverte). Tout le reste renvoie vers l'accueil.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
