"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { OrderStatus } from "@fondamental/shared";
import { searchOrders } from "@/lib/api/admin";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { PanierIcon } from "@/components/icons";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { ORDER_STATUS, formatAmount, formatDateTime } from "@/features/admin/labels";
import { useAdminData } from "@/features/admin/useAdminData";

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [emailInput, setEmailInput] = useState("");
  const [email, setEmail] = useState("");
  const { data: orders, error } = useAdminData(
    () => searchOrders({ status: status || undefined, email: email || undefined }),
    [status, email],
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setEmail(emailInput.trim().toLowerCase());
  }

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Commandes" description="Les 100 plus récentes correspondant aux filtres." />

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <Field label="Statut" htmlFor="status" className="w-[180px]">
          <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
            <option value="">Tous</option>
            {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="E-mail exact du client" htmlFor="email" className="min-w-[240px] flex-1">
          <Input id="email" type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
        </Field>
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
      </form>

      {error && <Alert variant="error">{error}</Alert>}
      {!orders && !error && <Skeleton className="h-48" />}
      {orders && orders.length === 0 && (
        <EmptyState icon={<PanierIcon width={26} height={26} />} title="Aucune commande" description="Rien ne correspond à ces filtres." />
      )}
      {orders && orders.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Client</th>
              <th scope="col">Plugin</th>
              <th scope="col" className="text-right">Montant</th>
              <th scope="col">Statut</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="whitespace-nowrap">
                  <Link href={`/admin/commandes/${order.id}`} className="text-accent-text hover:underline">
                    {formatDateTime(order.createdAt)}
                  </Link>
                </td>
                <td className="max-w-[240px] truncate">{order.userEmail ?? <span className="text-muted">Compte supprimé</span>}</td>
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
    </div>
  );
}
