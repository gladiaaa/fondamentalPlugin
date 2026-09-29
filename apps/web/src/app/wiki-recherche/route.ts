import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

// Recherche du wiki (#29). Hors de /api/* : ce préfixe est envoyé à l'API par nginx.
export const { GET } = createFromSource(source, { language: "french" });
