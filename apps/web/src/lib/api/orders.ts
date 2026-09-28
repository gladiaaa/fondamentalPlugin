import type { CheckoutResponse, OrderResponse } from "@fondamental/shared";
import { apiFetch } from "./client";

/**
 * Achat (#23, #24, docs/api-front.md §4) : crée la commande et la session
 * Stripe Checkout. Rediriger ensuite le navigateur vers `url`. Appelée depuis
 * le navigateur : dépend de la session et du jeton anti-CSRF (§8).
 */
export function checkout(productSlug: string, csrfToken: string): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>("/checkout", { method: "POST", body: { productSlug }, csrfToken });
}

/** Statut de la commande, interrogé par /merci jusqu'à `LICENSED` (§4). Dépend de la session. */
export function getOrderBySession(sessionId: string): Promise<OrderResponse> {
  return apiFetch<OrderResponse>(`/orders/by-session/${encodeURIComponent(sessionId)}`);
}
