"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getOrder, refundOrder, resendOrderEmail } from "@/lib/api/admin";
import { useSession } from "@/lib/session/SessionContext";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { LicenseKey } from "@/features/account/LicenseKey";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { ConfirmButton } from "@/features/admin/ConfirmButton";
import { ORDER_STATUS, formatAmount, formatDateTime } from "@/features/admin/labels";
import { adminErrorMessage, useAdminData } from "@/features/admin/useAdminData";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 last:border-b-0 sm:grid-cols-[200px_1fr]">
      <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { csrfToken } = useSession();
  const { data: order, error, reload } = useAdminData(() => getOrder(id), [id]);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, done: string) {
    if (!csrfToken) return;
    setActionError(null);
    try {
      await action();
      toast.success(done);
      reload();
    } catch (err) {
      setActionError(adminErrorMessage(err));
    }
  }

  return (
    <div className="grid gap-6">
      <nav className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">
        <Link href="/admin/commandes" className="hover:text-text">
          Commandes
        </Link>{" "}
        / détail
      </nav>
      <AdminPageHeader title="Commande" />
      {error && <Alert variant="error">{error}</Alert>}
      {!order && !error && <Skeleton className="h-64" />}
      {order && (
        <>
          <dl className="rounded-card-lg border border-line bg-surface px-5">
            <Row label="Statut">
              <Badge variant={ORDER_STATUS[order.status].variant}>{ORDER_STATUS[order.status].label}</Badge>
            </Row>
            <Row label="Date">{formatDateTime(order.createdAt)}</Row>
            <Row label="Client">
              <Link href={`/admin/utilisateurs/${order.userId}`} className="text-accent-text hover:underline">
                {order.userEmail}
              </Link>
            </Row>
            <Row label="Plugin">{order.productSlug}</Row>
            <Row label="Montant">{formatAmount(order.amountCents, order.currency)}</Row>
            <Row label="Session Stripe">
              <code className="text-[.85rem]">{order.stripeCheckoutSessionId}</code>
            </Row>
            <Row label="Paiement Stripe">
              {order.stripePaymentIntentId ? <code className="text-[.85rem]">{order.stripePaymentIntentId}</code> : "—"}
            </Row>
            <Row label="Clé de licence">{order.licenseKey ? <LicenseKey value={order.licenseKey} /> : "Pas encore créée"}</Row>
          </dl>

          {actionError && <Alert variant="error">{actionError}</Alert>}
          <div className="flex flex-wrap items-start gap-3">
            {order.licenseKey && (
              <ConfirmButton
                variant="primary"
                question={`Renvoyer la clé par e-mail à ${order.userEmail} ?`}
                confirmLabel="Renvoyer l'e-mail"
                onConfirm={() => run(() => resendOrderEmail(order.id, csrfToken!), "E-mail renvoyé.")}
              >
                Renvoyer l&apos;e-mail de licence
              </ConfirmButton>
            )}
            {order.stripePaymentIntentId && order.status !== "REFUNDED" && (
              <ConfirmButton
                question={`Rembourser ${formatAmount(order.amountCents, order.currency)} via Stripe ? La clé de licence sera révoquée tout de suite.`}
                confirmLabel="Rembourser"
                onConfirm={() => run(() => refundOrder(order.id, csrfToken!), "Commande remboursée, licence révoquée.")}
              >
                Rembourser
              </ConfirmButton>
            )}
          </div>
        </>
      )}
    </div>
  );
}
