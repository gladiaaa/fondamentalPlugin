/** Formatage partagé entre les pages catalogue/fiche (prix, taille de fichier, date). */

/** `1990` -> `"19,90 €"`. */
export function formatPriceCents(amountCents: number): string {
  return `${(amountCents / 100).toFixed(2).replace(".", ",")} €`;
}

/** `1258291` -> `"1,2 Mo"`. Les fichiers de plugin ne dépassent pas quelques Mo : pas besoin des Go. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const ko = bytes / 1024;
  if (ko < 1024) return `${ko.toFixed(ko < 10 ? 1 : 0).replace(".", ",")} Ko`;
  return `${(ko / 1024).toFixed(ko / 1024 < 10 ? 1 : 0).replace(".", ",")} Mo`;
}

/** Date ISO 8601 -> `"26 sept. 2026"`. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
