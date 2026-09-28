import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

// Mémorise la promesse de démarrage : React (mode strict, développement)
// invoque l'effet de MockingProvider deux fois, et `worker.start()` refuse
// un deuxième appel une fois le worker déjà actif ("cannot configure an
// already enabled network").
let startPromise: ReturnType<typeof worker.start> | null = null;
export function startWorker() {
  startPromise ??= worker.start({ onUnhandledRequest: "bypass" });
  return startPromise;
}
