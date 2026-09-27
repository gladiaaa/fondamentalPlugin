import { loader } from "fumadocs-core/source";
import { docs } from "../../.source/server";

/** Chargeur du contenu MDX du wiki (content/docs/*.mdx, voir source.config.ts). */
export const source = loader({
  baseUrl: "/wiki",
  source: docs.toFumadocsSource(),
});
