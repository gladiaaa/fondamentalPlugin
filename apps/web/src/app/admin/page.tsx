"use client";

import Link from "next/link";
import { getStats } from "@/lib/api/admin";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { SalesChart } from "@/features/admin/SalesChart";
import { ACTION_LABEL, formatAmount, formatDateTime } from "@/features/admin/labels";
import { useAdminData } from "@/features/admin/useAdminData";

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="grid gap-1 rounded-card-lg border border-line bg-surface p-4">
      <span className="font-mono text-[.68rem] uppercase tracking-[.08em] text-muted">{label}</span>
      <b className="font-display text-[1.5rem] font-semibold tabular-nums tracking-[-.03em]">{value}</b>
      {detail && <span className="text-[.82rem] text-muted">{detail}</span>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: stats, error } = useAdminData(getStats);

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Tableau de bord" />
      {error && <Alert variant="error">{error}</Alert>}
      {!stats && !error && <Skeleton className="h-64" />}
      {stats && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(stats.revenue.length ? stats.revenue : [{ currency: "eur", totalCents: 0, last30DaysCents: 0 }]).map((r) => (
              <StatTile
                key={r.currency}
                label="Chiffre d'affaires"
                value={formatAmount(r.totalCents, r.currency)}
                detail={`${formatAmount(r.last30DaysCents, r.currency)} sur 30 jours`}
              />
            ))}
            <StatTile
              label="Commandes livrées"
              value={String(stats.orders.licensed)}
              detail={`${stats.orders.pending} en attente · ${stats.orders.refunded} remboursée${stats.orders.refunded > 1 ? "s" : ""}`}
            />
            <StatTile
              label="Comptes"
              value={String(stats.users.total)}
              detail={`${stats.users.verified} confirmés · ${stats.users.admins} admin${stats.users.admins > 1 ? "s" : ""}`}
            />
            <StatTile
              label="Téléchargements"
              value={String(stats.products.reduce((sum, p) => sum + p.downloads, 0))}
              detail="Toutes versions confondues"
            />
          </div>

          <SalesChart points={stats.salesLast30Days} />

          <section className="grid gap-3">
            <h2 className="font-display text-[1.05rem] font-semibold">Par plugin</h2>
            <Table>
              <thead>
                <tr>
                  <th scope="col">Plugin</th>
                  <th scope="col" className="text-right">Ventes</th>
                  <th scope="col" className="text-right">Chiffre d&apos;affaires</th>
                  <th scope="col" className="text-right">Téléchargements</th>
                </tr>
              </thead>
              <tbody>
                {stats.products.map((p) => (
                  <tr key={p.slug}>
                    <td className="font-semibold">{p.name}</td>
                    <td className="text-right tabular-nums">{p.sales}</td>
                    <td className="text-right tabular-nums">{formatAmount(p.revenueCents, "eur")}</td>
                    <td className="text-right tabular-nums">{p.downloads}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>

          <section className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[1.05rem] font-semibold">Dernières actions</h2>
              <Link href="/admin/journal" className="text-[.88rem] text-accent-text">
                Tout le journal
              </Link>
            </div>
            {stats.recentActions.length === 0 ? (
              <p className="text-[.9rem] text-muted">Aucune action pour l&apos;instant.</p>
            ) : (
              <ul className="grid gap-2">
                {stats.recentActions.map((a) => (
                  <li key={a.id} className="flex flex-wrap justify-between gap-2 rounded-card border border-line bg-surface px-4 py-3 text-[.9rem]">
                    <span>
                      <b>{ACTION_LABEL[a.action] ?? a.action}</b> <span className="text-muted">par {a.adminEmail}</span>
                    </span>
                    <span className="text-muted">{formatDateTime(a.createdAt)}</span>
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
