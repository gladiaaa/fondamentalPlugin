"use client";

import { useEffect, useState } from "react";

/**
 * Démarre MSW dans le navigateur si `NEXT_PUBLIC_API_MOCKING=enabled`
 * (fichier `.env.local`, jamais commité). Retarde l'affichage des enfants
 * d'un tick pour que le worker intercepte les toutes premières requêtes ;
 * sans la variable, ne fait rien (comportement par défaut : API réelle).
 */
export function MockingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(
    process.env.NEXT_PUBLIC_API_MOCKING !== "enabled",
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING !== "enabled") return;
    import("./browser").then(({ worker }) =>
      worker.start({ onUnhandledRequest: "bypass" }).then(() => setReady(true)),
    );
  }, []);

  if (!ready) return null;
  return children;
}
