import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serveur autonome minimal, copié tel quel dans l'image Docker.
  output: "standalone",
  // Pas de fichier AGENTS.md généré automatiquement : CLAUDE.md est maintenu à la main.
  agentRules: false,
};

export default nextConfig;
