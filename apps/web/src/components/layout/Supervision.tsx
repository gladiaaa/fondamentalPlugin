"use client";

import { useEffect } from "react";
import type { ConfigPublique } from "@/app/config-publique/route";

/**
 * Active Sentry et Umami dans le navigateur d'après `/config-publique` (#33). Sentry n'est chargé que
 * s'il est configuré, pour ne pas alourdir les pages sinon.
 */
export function Supervision() {
  useEffect(() => {
    let cancelled = false;
    fetch("/config-publique")
      .then((res) => (res.ok ? (res.json() as Promise<ConfigPublique>) : null))
      .then(async (config) => {
        if (!config || cancelled) return;
        if (config.sentryDsn) {
          const Sentry = await import("@sentry/nextjs");
          Sentry.init({
            dsn: config.sentryDsn,
            environment: config.environment,
            release: config.release ?? undefined,
            tracesSampleRate: 0,
          });
        }
        if (config.umami && !document.getElementById("umami")) {
          const script = document.createElement("script");
          script.id = "umami";
          script.defer = true;
          script.src = config.umami.scriptUrl;
          script.dataset.websiteId = config.umami.websiteId;
          // Seulement ce domaine (pas les copies locales du site), et respect de « Do Not Track ».
          script.dataset.domains = window.location.hostname;
          script.dataset.doNotTrack = "true";
          document.head.appendChild(script);
        }
      })
      .catch(() => {
        // Supervision indisponible : le site fonctionne normalement sans.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
