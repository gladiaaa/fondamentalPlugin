"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiRequestError } from "@/lib/api/client";

/** Message d'erreur lisible pour une requête admin qui échoue. */
export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === "TWO_FACTOR_REQUIRED") return "Double authentification requise : rechargez la page.";
    if (error.statusCode === 401) return "Session expirée : reconnectez-vous.";
    if (error.statusCode === 403) return "Accès refusé.";
    if (error.statusCode === 404) return "Introuvable.";
    if (error.message) return error.message;
  }
  return "Une erreur inattendue s'est produite.";
}

/**
 * Charge une donnée du back-office au montage, et de nouveau quand `deps` change (filtres, id de la
 * page). `reload()` la relit après une action (remboursement, blocage…). `null` tant qu'elle n'est pas
 * arrivée. `deps` ne doit contenir que des valeurs simples (texte, nombre) : elles servent de clé.
 */
export function useAdminData<T>(load: () => Promise<T>, deps: ReadonlyArray<string | number | undefined> = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(adminErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
    // `load` est une nouvelle fonction à chaque rendu : seuls ses paramètres (`key`) et `reload` comptent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload, setData };
}
