"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

/**
 * Toasts (`.toast` de la maquette) : retours brefs uniquement (« Clé copiée »…),
 * jamais une confirmation d'action (brief §8) — ça reste dans la page.
 * Un seul `<Toaster />` à monter dans `layout.tsx`, on appelle `toast(...)`
 * (de `sonner`) depuis n'importe quel composant client ensuite.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-center gap-2.5 rounded-card bg-surface-2 border border-line px-4 py-3 text-[.9rem] text-text shadow-[0_12px_32px_rgba(0,0,0,.35)]",
          success: "[&_svg]:text-success",
          error: "[&_svg]:text-error",
          info: "[&_svg]:text-info",
        },
      }}
    />
  );
}
