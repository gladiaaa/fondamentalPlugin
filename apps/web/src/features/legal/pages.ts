export interface LegalPageConfig {
  slug: string;
  href: string;
  title: string;
  /** Titre court pour la navigation (brief : « CGV », pas le titre complet). */
  navLabel: string;
}

/** Date de la dernière modification des textes (affichée sur chaque page). */
export const LEGAL_UPDATED_AT = "30 septembre 2026";

/**
 * Textes à faire relire (#35) : tant que c'est `true`, chaque page porte la mention « Brouillon · à
 * faire valider ». À passer à `false` une fois les textes validés et les informations manquantes
 * complétées (`editeur.ts`).
 */
export const LEGAL_DRAFT = true;

/** Les 4 pages légales (#35, #92), dans l'ordre de la navigation. */
export const LEGAL_PAGES: LegalPageConfig[] = [
  { slug: "cgv", href: "/cgv", title: "Conditions générales de vente", navLabel: "CGV" },
  { slug: "mentions-legales", href: "/mentions-legales", title: "Mentions légales", navLabel: "Mentions légales" },
  {
    slug: "confidentialite",
    href: "/confidentialite",
    title: "Politique de confidentialité",
    navLabel: "Confidentialité",
  },
  { slug: "cookies", href: "/cookies", title: "Cookies", navLabel: "Cookies" },
];
