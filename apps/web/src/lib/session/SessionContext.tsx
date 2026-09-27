"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser } from "@fondamental/shared";
import { apiFetch } from "@/lib/api/client";
import { logout as apiLogout } from "@/lib/api/auth";

interface SessionState {
  user: AuthUser | null;
  /** En mémoire uniquement : jamais `localStorage` ni une URL (docs/api-front.md §8). */
  csrfToken: string | null;
  /** `"loading"` le temps du `GET /auth/me` initial : évite un flash « visiteur » à chaque chargement. */
  status: "loading" | "authenticated" | "anonymous";
}

interface SessionContextValue extends SessionState {
  /** Après un login/register réussi : la réponse contient déjà `user`/`csrfToken`, pas besoin de rappeler `/auth/me`. */
  setSession: (user: AuthUser, csrfToken: string) => void;
  /** Déconnecte côté API puis efface la session locale. */
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ user: null, csrfToken: null, status: "loading" });

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ user: AuthUser; csrfToken: string }>("/auth/me")
      .then(({ user, csrfToken }) => {
        if (!cancelled) setState({ user, csrfToken, status: "authenticated" });
      })
      .catch(() => {
        // 401 (pas de session) ou erreur réseau : dans les deux cas, l'affichage reste « visiteur ».
        if (!cancelled) setState({ user: null, csrfToken: null, status: "anonymous" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback((user: AuthUser, csrfToken: string) => {
    setState({ user, csrfToken, status: "authenticated" });
  }, []);

  const logout = useCallback(async () => {
    // `POST /auth/logout` répond 204 même si la session a déjà expiré
    // (docs/api-front.md §4) : un échec ici est forcément réseau, jamais un
    // refus. On efface la session affichée dans tous les cas, le cookie
    // expirera de son côté.
    try {
      await apiLogout();
    } finally {
      setState({ user: null, csrfToken: null, status: "anonymous" });
    }
  }, []);

  return (
    <SessionContext.Provider value={{ ...state, setSession, logout }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession() doit être appelé sous <SessionProvider>.");
  return ctx;
}
