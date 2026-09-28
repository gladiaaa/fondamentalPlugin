import { apiFetch } from "./client";

/**
 * Achat (#23, #24) : route « prévue » (docs/api-front.md §7), simulée par
 * MSW (src/mocks/handlers.ts) tant qu'elle n'est pas livrée. Type local, pas
 * de `@fondamental/shared` : le contrat n'est qu'indicatif, pas encore figé.
 */
export interface OrderStatus {
  status: "pending" | "paid" | "licensed" | "refunded";
  product: { slug: string; name: string };
  /** `null` tant que la licence n'est pas encore créée. */
  licenseKey: string | null;
}

/** Appelée depuis le navigateur : dépend de la session (docs/api-front.md §8). */
export function getOrderBySession(sessionId: string): Promise<OrderStatus> {
  return apiFetch<OrderStatus>(`/orders/by-session/${encodeURIComponent(sessionId)}`);
}
