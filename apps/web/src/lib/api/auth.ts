import type { MessageResponse, SessionResponse } from "@fondamental/shared";
import { apiFetch } from "./client";

/**
 * Tout ce qui dépend de la session (`/auth/*`) : à appeler uniquement depuis
 * le navigateur (composants clients), pour que le cookie et l'`Origin`
 * partent tout seuls (docs/api-front.md §8). Jamais depuis un Server
 * Component.
 */

export function register(email: string, password: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/auth/register", { method: "POST", body: { email, password } });
}

export function login(email: string, password: string): Promise<SessionResponse> {
  return apiFetch<SessionResponse>("/auth/login", { method: "POST", body: { email, password } });
}

/**
 * `logout` est une route publique côté API (elle efface le cookie même si
 * la session a déjà expiré) : pas de `csrfToken` à fournir, à la différence
 * de `logout-all`.
 */
export function logout(): Promise<void> {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export function verifyEmail(token: string): Promise<{ emailVerified: true }> {
  return apiFetch<{ emailVerified: true }>("/auth/verify-email", { method: "POST", body: { token } });
}

export function resendVerification(email: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/auth/resend-verification", { method: "POST", body: { email } });
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword(token: string, password: string): Promise<void> {
  return apiFetch<void>("/auth/reset-password", { method: "POST", body: { token, password } });
}
