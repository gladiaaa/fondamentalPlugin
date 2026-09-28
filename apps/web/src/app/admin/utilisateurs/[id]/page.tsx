"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getUser, updateUser } from "@/lib/api/admin";
import { useSession } from "@/lib/session/SessionContext";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { LicenseKey } from "@/features/account/LicenseKey";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { ConfirmButton } from "@/features/admin/ConfirmButton";
import { ORDER_STATUS, formatAmount, formatDateTime } from "@/features/admin/labels";
import { adminErrorMessage, useAdminData } from "@/features/admin/useAdminData";

export default function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { csrfToken, user: me } = useSession();
  const { data: user, error, setData } = useAdminData(() => getUser(id), [id]);
  const [actionError, setActionError] = useState<string | null>(null);
  const isMe = me?.id === id;

  async function apply(patch: { role?: "CUSTOMER" | "ADMIN"; blocked?: boolean }, done: string) {
    if (!csrfToken) return;
    setActionError(null);
    try {
      setData(await updateUser(id, patch, csrfToken));
      toast.success(done);
    } catch (err) {
      setActionError(adminErrorMessage(err));
    }
  }

  return (
    <div className="grid gap-6">
      <nav className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">
        <Link href="/admin/utilisateurs" className="hover:text-text">
          Utilisateurs
        </Link>{" "}
        / fiche
      </nav>
      {error && <Alert variant="error">{error}</Alert>}
      {!user && !error && <Skeleton className="h-64" />}
      {user && (
        <>
          <AdminPageHeader title={user.email} />
          <div className="flex flex-wrap gap-2">
            {user.role === "ADMIN" ? <Badge variant="accent">Admin</Badge> : <Badge variant="neutral">Client</Badge>}
            {user.blockedAt && <Badge variant="error">Bloqué depuis le {formatDateTime(user.blockedAt)}</Badge>}
            {!user.emailVerifiedAt && <Badge variant="warning">Adresse non confirmée</Badge>}
            {user.role === "ADMIN" && (
              <Badge variant={user.twoFactorEnabled ? "success" : "warning"}>
                {user.twoFactorEnabled ? "2FA activée" : "2FA pas encore activée"}
              </Badge>
            )}
            <span className="text-[.88rem] text-muted">Inscrit le {formatDateTime(user.createdAt)}</span>
          </div>

          {actionError && <Alert variant="error">{actionError}</Alert>}
          {isMe ? (
            <p className="text-[.9rem] text-muted">C&apos;est votre compte : ni blocage ni changement de rôle possibles ici.</p>
          ) : (
            <div className="flex flex-wrap items-start gap-3">
              {user.blockedAt ? (
                <ConfirmButton
                  variant="primary"
                  question="Débloquer ce compte ? La personne pourra de nouveau se connecter."
                  confirmLabel="Débloquer"
                  onConfirm={() => apply({ blocked: false }, "Compte débloqué.")}
                >
                  Débloquer
                </ConfirmButton>
              ) : (
                <ConfirmButton
                  question="Bloquer ce compte ? Ses sessions sont fermées et la connexion lui est refusée. Ses licences restent valides."
                  confirmLabel="Bloquer"
                  onConfirm={() => apply({ blocked: true }, "Compte bloqué.")}
                >
                  Bloquer
                </ConfirmButton>
              )}
              {user.role === "ADMIN" ? (
                <ConfirmButton
                  question="Retirer les droits d'administration ? Ses sessions seront fermées."
                  confirmLabel="Retirer les droits"
                  onConfirm={() => apply({ role: "CUSTOMER" }, "Droits d'administration retirés.")}
                >
                  Retirer les droits admin
                </ConfirmButton>
              ) : (
                <ConfirmButton
                  variant="primary"
                  question="Donner l'accès complet au back-office (commandes, remboursements, comptes) ? La 2FA lui sera demandée."
                  confirmLabel="Nommer admin"
                  onConfirm={() => apply({ role: "ADMIN" }, "Compte nommé admin.")}
                >
                  Nommer admin
                </ConfirmButton>
              )}
            </div>
          )}

          <section className="grid gap-3">
            <h2 className="font-display text-[1.05rem] font-semibold">Commandes ({user.orders.length})</h2>
            {user.orders.length === 0 ? (
              <p className="text-[.9rem] text-muted">Aucune commande.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Plugin</th>
                    <th scope="col" className="text-right">Montant</th>
                    <th scope="col">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {user.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap">
                        <Link href={`/admin/commandes/${order.id}`} className="text-accent-text hover:underline">
                          {formatDateTime(order.createdAt)}
                        </Link>
                      </td>
                      <td>{order.productSlug}</td>
                      <td className="text-right tabular-nums">{formatAmount(order.amountCents, order.currency)}</td>
                      <td>
                        <Badge variant={ORDER_STATUS[order.status].variant}>{ORDER_STATUS[order.status].label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>

          <section className="grid gap-3">
            <h2 className="font-display text-[1.05rem] font-semibold">Licences ({user.licenses.length})</h2>
            {user.licenses.length === 0 ? (
              <p className="text-[.9rem] text-muted">Aucune licence.</p>
            ) : (
              <ul className="grid gap-3">
                {user.licenses.map((license) => (
                  <li key={license.key} className="grid gap-2 rounded-card border border-line bg-surface p-4">
                    <span className="text-[.88rem] text-muted">
                      {license.productSlug ?? "Clé rattachée à la main"} · depuis le {formatDateTime(license.claimedAt)}
                    </span>
                    <LicenseKey value={license.key} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
