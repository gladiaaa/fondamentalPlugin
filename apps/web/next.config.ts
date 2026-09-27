import path from "node:path";
import type { NextConfig } from "next";

// Racine du monorepo : les dépendances et packages/shared y vivent.
const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  // Serveur autonome minimal, copié tel quel dans l'image Docker.
  output: "standalone",
  // Trace les fichiers depuis la racine du monorepo, sinon le serveur autonome
  // n'embarque pas les dépendances installées à la racine.
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
    // Icônes de la charte (docs/front/charte/icones/) importées comme des
    // composants React : import Icone from "@/../public/icones/x.svg".
    rules: {
      "*.svg": {
        // `icon: true` : remplace le width/height du SVG source (16 à 256
        // selon les fichiers, voir docs/front/charte/icones/) par `1em`,
        // pour que l'icône hérite la taille du texte autour d'elle par
        // défaut. Un composant qui a besoin d'une taille précise passe
        // toujours `width`/`height` explicitement (ex. PluginCard).
        loaders: [{ loader: "@svgr/webpack", options: { icon: true } }],
        as: "*.js",
      },
    },
  },
  // Le package partagé est livré en TypeScript : Next.js le compile.
  transpilePackages: ["@fondamental/shared"],
  // Pas de fichier AGENTS.md généré automatiquement : CLAUDE.md est maintenu à la main.
  agentRules: false,
  async headers() {
    // Referrer-Policy: no-referrer sur les deux pages qui portent un jeton
    // dans l'URL (vérification d'e-mail, réinitialisation de mot de passe) :
    // évite qu'il fuite dans l'en-tête Referer d'une requête sortante (une
    // icône ou un lien externe sur la page) avant que le composant ait pu le
    // retirer de l'URL avec history.replaceState.
    return [
      {
        source: "/verifier-email",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/reinitialiser-mot-de-passe",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
  async rewrites() {
    // En dev, le site (3000) et l'API (4000) sont sur deux ports distincts ;
    // en dev/prod déployés, nginx envoie déjà /api/* à l'API avant même
    // d'atteindre ce serveur Next (voir CLAUDE.md, section API) : cette règle
    // n'a donc d'effet qu'en local, et le garde-fou ci-dessous est une
    // précaution, pas la protection réelle.
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
