/** Accroche et points forts de chaque plugin (vérifiés dans leur code, voir le wiki). */
export const PITCH: Record<string, { tagline: string; points: string[] }> = {
  bedwars: {
    tagline: "Un Bedwars complet, prêt à jouer.",
    points: [
      "9 modes, jusqu’à 8 équipes, un monde neuf par partie",
      "Matchmaking, vote de carte, party et parties privées",
      "Classé Elo et 8 rangs, classements en hologramme (Premium)",
      "82 cosmétiques achetés avec les coins gagnés en jouant",
      "Boutique, pièges et améliorations d’équipe réglables",
    ],
  },
  tag: {
    tagline: "Des tags qui se voient, jusque dans le chat.",
    points: [
      "Dans le chat, au-dessus de la tête et dans le TAB",
      "12 effets animés et 9 styles de lettres (Premium)",
      "L’Atelier : chaque joueur compose son propre tag",
      "Boutique, raretés et tags saisonniers à dates",
      "Reprend automatiquement une installation TagsCustom",
    ],
  },
  crate: {
    tagline: "Des crates qui donnent envie d’ouvrir.",
    points: [
      "9 animations, dont une chambre au trésor en 3D (Premium)",
      "Éditeur 100 % en jeu, sans toucher un fichier",
      "Pitié, limites de gain, paliers, « quitte ou double » (Premium)",
      "Clés physiques et virtuelles, ouverture multiple",
      "Chances affichées = chances réelles, aucune clé perdue",
    ],
  },
  pass: {
    tagline: "Un pass de saison pour tout votre réseau.",
    points: [
      "Piste gratuite et piste premium à vendre à vos joueurs",
      "Quêtes du jour, de la semaine et de saison, tirées au hasard",
      "15 objectifs, dont n’importe quel placeholder (Premium)",
      "La même progression sur tous vos serveurs (Premium)",
      "Parchemins, calendrier de connexion, pass événement",
    ],
  },
  shop: {
    tagline: "Une boutique en menus, sans site à brancher.",
    points: [
      "Objets, clés de caisses, grades LuckPerms, tags et commandes",
      "Revente avec /sell, /sell all et bonus par grade",
      "Limites par joueur, délais et confirmation d’achat",
      "Vos propres commandes : /boutique, /grades, /clés…",
      "Boutique du jour, promotions et stock commun (Premium)",
    ],
  },
  essentials: {
    tagline: "Les essentiels d’un serveur, gratuits pour toujours.",
    points: [
      "Spawn, homes partagés, warps et téléportations",
      "Économie Vault avec journal de chaque mouvement",
      "Kits, coffres virtuels, courrier et format du chat",
      "Chaque bloc se désactive, ses commandes avec",
      "Homes, warps et soldes partagés en réseau (MySQL)",
    ],
  },
};

/** Ordre de présentation de la gamme. */
export const ORDER = ["bedwars", "tag", "crate", "pass", "shop", "essentials"];
