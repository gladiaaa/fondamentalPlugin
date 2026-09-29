import { defineDocs, defineConfig } from "fumadocs-mdx/config";

// Wiki des plugins (#29, #31) : une page MDX par sujet dans content/docs/<plugin>/.
export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig();
