import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";
import { WIKI_TRANSLATIONS } from "@/features/wiki/translations";

/**
 * Wiki des plugins (#29) : thème de Fumadocs désactivé (le site a déjà le sien, `ThemeProvider` dans
 * le layout racine). Recherche servie par `/wiki-recherche` : `/api/*` appartient à l'API (nginx).
 */
export default function WikiLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      theme={{ enabled: false }}
      search={{ options: { api: "/wiki-recherche" } }}
      i18n={{ locale: "fr", translations: WIKI_TRANSLATIONS }}
    >
      <DocsLayout tree={source.pageTree} nav={{ title: "Wiki", url: "/wiki" }} themeSwitch={{ enabled: false }}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
