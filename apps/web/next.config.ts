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
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  // Le package partagé est livré en TypeScript : Next.js le compile.
  transpilePackages: ["@fondamental/shared"],
  // Pas de fichier AGENTS.md généré automatiquement : CLAUDE.md est maintenu à la main.
  agentRules: false,
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
