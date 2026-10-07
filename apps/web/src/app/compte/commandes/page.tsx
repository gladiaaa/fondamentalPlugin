"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MyOrder } from "@fondamental/shared";
import { Alert } from "@/components/ui/Alert";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { PanierIcon } from "@/components/icons";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { ApiRequestError } from "@/lib/api/client";
import { getInvoiceLink, getMyOrders } from "@/lib/api/orders";
import { formatDate } from "@/lib/format";

const STATUS: Record<MyOrder["status"], { label: string; variant: BadgeVariant }> = {
  PAID: { label: "Payée, clé en préparation", variant: "info" },
  LICENSED: { label: "Livrée", variant: "success" },
  REFUNDED: { label: "Remboursée", variant: "warning" },
};

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default function CommandesPage() {
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    getMyOrders()
      .then(setOrders)
      .catch(() => setLoadError(true));
  }, []);

  async function openInvoice(orderId: string) {
    setInvoiceError(null);
    setOpening(orderId);
    // L'onglet est ouvert pendant le clic : ouvert après la réponse de l'API, le navigateur le bloquerait.
    const tab = window.open("", "_blank");
    try {
      const { url } = await getInvoiceLink(orderId);
      if (tab) {
        tab.opener = null;
        tab.location.assign(url);
      } else {
        window.location.assign(url);
      }
    } catch (error) {
      tab?.close();
      setInvoiceError(
        error instanceof ApiRequestError && error.code === "INVOICE_NOT_FOUND"
          ? "La facture n'est pas encore prête : Stripe la crée quelques minutes après le paiement. Réessayez plus tard."
          : "La facture n'a pas pu être ouverte. Réessayez dans un instant.",
      );
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Espace client</p>
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Mes commandes</h1>
      </div>

      {invoiceError && (
        <Alert variant="error" title="Facture indisponible">
          {invoiceError}
        </Alert>
      )}

      <div className="grid gap-3 rounded-card-lg border border-line bg-surface p-5">
        {orders === null && !loadError && (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        )}
        {loadError && (
          <Alert variant="error" title="Vos commandes n'ont pas pu être chargées">
            Réessayez dans un instant.
          </Alert>
        )}
        {orders?.length === 0 && (
          <EmptyState
            icon={<PanierIcon width={26} height={26} />}
            title="Aucune commande pour l'instant"
            description="Vos achats de licences Premium apparaîtront ici, avec leur facture."
            action={
              <Button asChild variant="secondary">
                <Link href="/plugins">Voir les plugins</Link>
              </Button>
            }
          />
        )}
        {orders && orders.length > 0 && (
          <ul className="grid gap-3">
            {orders.map((order) => {
              const Icon = PLUGIN_ICONS[order.product.slug];
              const status = STATUS[order.status];
              return (
                <li
                  key={order.id}
                  className="grid gap-3 border-b border-line pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {Icon ? <Icon width={34} height={34} /> : <PanierIcon width={26} height={26} className="text-muted" />}
                    <div className="grid min-w-0 gap-0.5">
                      <span className="truncate font-display text-[1rem] font-semibold">{order.product.name} Premium</span>
                      <span className="text-[.85rem] text-muted">
                        {formatDate(order.createdAt)} ·{" "}
                        <span className="tabular-nums text-text">{formatAmount(order.amountCents, order.currency)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={opening === order.id}
                      onClick={() => openInvoice(order.id)}
                    >
                      Facture
                    </Button>
                  </div>
                  {order.status === "REFUNDED" && (
                    <p className="text-[.85rem] text-muted sm:col-span-2">
                      Commande remboursée : la clé de licence associée a été révoquée.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[.85rem] text-muted">
        Vos clés de licence sont dans <Link href="/compte/licences" className="text-accent-text">Mes licences</Link>. Une
        question sur une commande ? Écrivez au <Link href="/support" className="text-accent-text">support</Link>.
      </p>
    </div>
  );
}
