import type {
  AdminActionEntry,
  AdminLicenseResponse,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminProductResponse,
  AdminReleaseResponse,
  AdminStatsResponse,
  AdminUserDetail,
  AdminUserSummary,
  OrderStatus,
  RecreatedLicenseResponse,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
} from "@fondamental/shared";
import { apiFetch } from "./client";

/**
 * Back-office (#32, #105, #106 ; docs/api-front.md § Administration). Tout se fait depuis le
 * navigateur (session + jeton anti-CSRF) : rôle admin et 2FA validée pour la session exigés.
 */

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
  const text = search.toString();
  return text ? `?${text}` : "";
};

// ─── 2FA ──────────────────────────────────────────────────────────

export const getTwoFactorStatus = () => apiFetch<TwoFactorStatusResponse>("/admin/2fa");

export const setupTwoFactor = (csrfToken: string) =>
  apiFetch<TwoFactorSetupResponse>("/admin/2fa/setup", { method: "POST", body: {}, csrfToken });

export const verifyTwoFactor = (code: string, csrfToken: string) =>
  apiFetch<void>("/admin/2fa/verify", { method: "POST", body: { code }, csrfToken });

// ─── Tableau de bord et journal ───────────────────────────────────

export const getStats = () => apiFetch<AdminStatsResponse>("/admin/stats");

export const getActions = (filters: { targetType?: string; targetId?: string; limit?: number } = {}) =>
  apiFetch<AdminActionEntry[]>(
    `/admin/actions${query({ ...filters, limit: filters.limit ? String(filters.limit) : undefined })}`,
  );

// ─── Commandes ────────────────────────────────────────────────────

export const searchOrders = (filters: { status?: OrderStatus; email?: string } = {}) =>
  apiFetch<AdminOrderSummary[]>(`/admin/orders${query(filters)}`);

export const getOrder = (id: string) => apiFetch<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}`);

export const refundOrder = (id: string, csrfToken: string) =>
  apiFetch<void>(`/admin/orders/${encodeURIComponent(id)}/refund`, { method: "POST", body: {}, csrfToken });

export const resendOrderEmail = (id: string, csrfToken: string) =>
  apiFetch<void>(`/admin/orders/${encodeURIComponent(id)}/resend-email`, { method: "POST", body: {}, csrfToken });

// ─── Licences (la clé part dans l'URL de l'API, jamais dans celle du site) ──

export const getLicense = (key: string) => apiFetch<AdminLicenseResponse>(`/admin/licenses/${encodeURIComponent(key)}`);

export const revokeLicense = (key: string, csrfToken: string) =>
  apiFetch<void>(`/admin/licenses/${encodeURIComponent(key)}/revoke`, { method: "POST", body: {}, csrfToken });

export const recreateLicense = (key: string, csrfToken: string) =>
  apiFetch<RecreatedLicenseResponse>(`/admin/licenses/${encodeURIComponent(key)}/recreate`, {
    method: "POST",
    body: {},
    csrfToken,
  });

// ─── Produits ─────────────────────────────────────────────────────

export const getAdminProducts = () => apiFetch<AdminProductResponse[]>("/admin/products");

export const updateProduct = (
  slug: string,
  patch: Partial<Pick<AdminProductResponse, "description" | "priceCents" | "stripePriceId" | "active">>,
  csrfToken: string,
) =>
  apiFetch<AdminProductResponse>(`/admin/products/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: patch,
    csrfToken,
  });

// ─── Utilisateurs ─────────────────────────────────────────────────

export const searchUsers = (q?: string) => apiFetch<AdminUserSummary[]>(`/admin/users${query({ q })}`);

export const getUser = (id: string) => apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);

export const updateUser = (id: string, patch: { role?: "CUSTOMER" | "ADMIN"; blocked?: boolean }, csrfToken: string) =>
  apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: patch, csrfToken });

// ─── Versions publiées ────────────────────────────────────────────

export const getReleases = (product?: string) => apiFetch<AdminReleaseResponse[]>(`/admin/releases${query({ product })}`);

export const updateRelease = (
  id: string,
  patch: { hidden?: boolean; channel?: "RELEASE" | "BETA"; changelog?: string },
  csrfToken: string,
) =>
  apiFetch<AdminReleaseResponse>(`/admin/releases/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
    csrfToken,
  });
