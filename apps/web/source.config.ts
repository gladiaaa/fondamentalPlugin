import { defineDocs, defineConfig } from "fumadocs-mdx/config";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";

// Wiki des plugins (#29, #31) : une page MDX par sujet dans content/docs/<plugin>/.
export const docs = defineDocs({
  dir: "content/docs",
});

/**
 * Coloration des blocs de commandes Minecraft (```mc) : la commande, ses paramètres `<arène>`,
 * les variables de boutique `{username}`, les constantes (`RED`, `WEAPONS`), les nombres et les
 * commentaires `# …` ressortent chacun dans leur couleur, au lieu d'un seul bloc de texte gris.
 */
const minecraftCommands = {
  name: "mc",
  scopeName: "source.minecraft-command",
  repository: {},
  patterns: [
    { match: "#.*$", name: "comment.line.number-sign" },
    // Commande en tête de ligne : /bw, //copy, ou tapée en console (tag, crate, lp…).
    { match: "^\\s*/{0,2}[a-z][a-z0-9_:-]*", name: "entity.name.function" },
    { match: "<[^>\\s]+>", name: "variable.parameter" },
    { match: "\\{[A-Za-z_]+\\}", name: "variable.other" },
    { match: "\\b[A-Z][A-Z0-9_]+\\b", name: "constant.language" },
    { match: "\\b[0-9]+[a-z]*\\b", name: "constant.numeric" },
  ],
};

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: { ...rehypeCodeDefaultOptions, langs: [minecraftCommands] },
  },
});
