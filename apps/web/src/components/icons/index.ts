// Icônes de la charte (docs/front/charte/icones/), importées comme des
// composants React via la règle Turbopack `*.svg` -> `@svgr/webpack`
// (apps/web/next.config.ts). Toutes héritent leur couleur de `currentColor` :
// coloreles avec `text-*` ou `className`, jamais un attribut `fill`/`stroke`.
//
// Les icônes de plugin et d'interface hors de cette liste sont des
// propositions de la maquette (voir docs/front/brief.md, section 6),
// pas encore validées : ne pas en ajouter d'autres sans vérifier la charte.

export { default as AlerteIcon } from "./interface/alerte.svg";
export { default as CleIcon } from "./interface/cle.svg";
export { default as CompteIcon } from "./interface/compte.svg";
export { default as DocumentationIcon } from "./interface/documentation.svg";
export { default as ErreurIcon } from "./interface/erreur.svg";
export { default as FiableIcon } from "./interface/fiable.svg";
export { default as FlecheIcon } from "./interface/fleche.svg";
export { default as InfoIcon } from "./interface/info.svg";
export { default as LicenceIcon } from "./interface/licence.svg";
export { default as LienExterneIcon } from "./interface/lien-externe.svg";
export { default as PanierIcon } from "./interface/panier.svg";
export { default as RapideIcon } from "./interface/rapide.svg";
export { default as RechercheIcon } from "./interface/recherche.svg";
export { default as ServeurIcon } from "./interface/serveur.svg";
export { default as SupportIcon } from "./interface/support.svg";
export { default as TelechargerIcon } from "./interface/telecharger.svg";
export { default as ValiderIcon } from "./interface/valider.svg";
// Propositions de la maquette, pas encore dans la charte officielle
// (brief §6) : nécessaires au composant PasswordField.
export { default as OeilIcon } from "./interface/oeil.svg";
export { default as OeilFermeIcon } from "./interface/oeil-ferme.svg";
export { default as CopieIcon } from "./interface/copie.svg";
export { default as PlusIcon } from "./interface/plus.svg";
export { default as DeconnexionIcon } from "./interface/deconnexion.svg";
export { default as ChevronBasIcon } from "./interface/chevron-bas.svg";
export { default as MenuIcon } from "./interface/menu.svg";
export { default as FermerIcon } from "./interface/fermer.svg";
export { default as ImageIcon } from "./interface/image.svg";

export { default as BedwarsPastilleIcon } from "./plugins/fondamental-bedwars-pastille.svg";
export { default as BedwarsContourIcon } from "./plugins/fondamental-bedwars-contour.svg";
export { default as TagPastilleIcon } from "./plugins/fondamental-tag-pastille.svg";
export { default as TagContourIcon } from "./plugins/fondamental-tag-contour.svg";
export { default as CratePastilleIcon } from "./plugins/fondamental-crate-pastille.svg";
export { default as CrateContourIcon } from "./plugins/fondamental-crate-contour.svg";
// Icône du Pass : nouvelle, proposition à valider (docs/front/brief.md §6).
export { default as PassPastilleIcon } from "./plugins/fondamental-pass-pastille.svg";
export { default as PassContourIcon } from "./plugins/fondamental-pass-contour.svg";
