import { defineDocs, defineConfig } from "fumadocs-mdx/config";

// Squelette uniquement (#86) : contenu réel à venir dans content/docs/*.mdx.
export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig();
