import type { OrderStatus } from "@fondamental/shared";
import type { BadgeVariant } from "@/components/ui/Badge";

/** Libellés et couleurs du back-office (#106). Les couleurs d'état vont toujours avec un texte. */

export const ORDER_STATUS: Record<OrderStatus, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "En attente", variant: "neutral" },
  PAID: { label: "Payée", variant: "info" },
  LICENSED: { label: "Livrée", variant: "success" },
  REFUNDED: { label: "Remboursée", variant: "warning" },
};

export const ACTION_LABEL: Record<string, string> = {
  "order.refund": "Commande remboursée",
  "order.resend_email": "E-mail de licence renvoyé",
  "license.revoke": "Licence révoquée",
  "license.recreate": "Licence recréée",
  "product.update": "Produit modifié",
  "user.role": "Rôle modifié",
  "user.block": "Compte bloqué",
  "user.unblock": "Compte débloqué",
  "release.update": "Version modifiée",
};

/** `2026-09-28T13:47:27Z` -> `"28 sept. 2026, 15:47"` (heure locale du navigateur). */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

/** Montant en centimes dans sa devise : `1599, "eur"` -> `"15,99 €"`. */
export function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
