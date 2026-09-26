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
  turbopack: { root: monorepoRoot },
  // Le package partagé est livré en TypeScript : Next.js le compile.
  transpilePackages: ["@fondamental/shared"],
  // Pas de fichier AGENTS.md généré automatiquement : CLAUDE.md est maintenu à la main.
  agentRules: false,
};

export default nextConfig;
