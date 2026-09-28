export interface LegalPageConfig {
  slug: string;
  href: string;
  title: string;
  /** Titre court pour la navigation (brief : « CGV », pas le titre complet). */
  navLabel: string;
  sections: string[];
}

/**
 * Squelette des pages légales (#35, #92) : titres de section repris de la
 * maquette, aucun texte juridique rédigé à la place d'Océane — voir
 * `LegalArticle`.
 */
export const LEGAL_PAGES: LegalPageConfig[] = [
  {
    slug: "cgv",
    href: "/cgv",
    title: "Conditions générales de vente",
    navLabel: "CGV",
    sections: [
      "Objet",
      "Produits et licences",
      "Prix et paiement",
      "Livraison",
      "Droit de rétractation",
      "Support",
      "Données personnelles",
      "Droit applicable",
    ],
  },
  {
    slug: "mentions-legales",
    href: "/mentions-legales",
    title: "Mentions légales",
    navLabel: "Mentions légales",
    sections: ["Éditeur du site", "Directeur de la publication", "Hébergeur", "Propriété intellectuelle"],
  },
  {
    slug: "confidentialite",
    href: "/confidentialite",
    title: "Politique de confidentialité",
    navLabel: "Confidentialité",
    sections: ["Données collectées", "Finalités", "Durée de conservation", "Destinataires", "Vos droits"],
  },
  {
    slug: "cookies",
    href: "/cookies",
    title: "Cookies",
    navLabel: "Cookies",
    sections: ["Cookies essentiels", "Cookies de mesure d'audience", "Gérer vos choix"],
  },
];
