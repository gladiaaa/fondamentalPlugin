/**
 * Identité du vendeur, reprise par toutes les pages légales (#35). Données publiques de l'entreprise
 * individuelle (annuaire des entreprises), rien d'autre : jamais de date de naissance ni de numéro
 * personnel ici, le dépôt est public.
 *
 * `null` = information encore à fournir : la page affiche « à compléter » à la place.
 */
export const EDITEUR = {
  nom: "Ryan Annic",
  forme: "Entrepreneur individuel (micro-entreprise)",
  siren: "928 684 331",
  siret: "928 684 331 00012",
  naf: "62.01Z (programmation informatique)",
  adresse: ["2 avenue Franklin Roosevelt", "77210 Avon", "France"],
  email: "support@fondamentalplugin.fr",
  /** Obligatoire pour la vente à distance (art. R111-1 du code de la consommation). */
  telephone: "06 52 18 42 20" as string | null,
  tva: "TVA non applicable, art. 293 B du CGI",
} as const;

export const HEBERGEUR = {
  nom: "Hostinger International Ltd",
  adresse: ["61 Lordou Vironos Street", "6023 Larnaca", "Chypre"],
  site: "https://www.hostinger.fr",
} as const;

/**
 * Médiateur de la consommation (art. L612-1 du code de la consommation), obligatoire pour vendre à des
 * particuliers. À désigner avant la mise en production.
 */
export const MEDIATEUR: { nom: string; site: string } | null = null;

export const SITE = "fondamentalplugin.fr";
