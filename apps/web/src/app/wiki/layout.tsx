import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "@/lib/source";

/**
 * Squelette du wiki (#86) : thème et recherche de Fumadocs désactivés — le
 * site a déjà son thème (`ThemeProvider`, layout.tsx racine) et la recherche
 * suppose un contenu réel à indexer, pas encore écrit.
 */
export default function WikiLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsLayout
        tree={source.pageTree}
        nav={{ title: "Wiki", url: "/wiki" }}
        themeSwitch={{ enabled: false }}
        searchToggle={{ enabled: false }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
