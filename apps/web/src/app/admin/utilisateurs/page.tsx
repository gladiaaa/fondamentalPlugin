"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { searchUsers } from "@/lib/api/admin";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { CompteIcon } from "@/components/icons";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { formatDateTime } from "@/features/admin/labels";
import { useAdminData } from "@/features/admin/useAdminData";

export default function AdminUsersPage() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const { data: users, error } = useAdminData(() => searchUsers(q || undefined), [q]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setQ(input.trim());
  }

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Utilisateurs" description="Les 100 comptes les plus récents correspondant à la recherche." />

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <Field label="Adresse e-mail (ou une partie)" htmlFor="q" className="min-w-[260px] flex-1">
          <Input id="q" value={input} onChange={(e) => setInput(e.target.value)} />
        </Field>
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
      </form>

      {error && <Alert variant="error">{error}</Alert>}
      {!users && !error && <Skeleton className="h-48" />}
      {users && users.length === 0 && (
        <EmptyState icon={<CompteIcon width={26} height={26} />} title="Aucun compte" description="Rien ne correspond à cette recherche." />
      )}
      {users && users.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th scope="col">Compte</th>
              <th scope="col">Rôle</th>
              <th scope="col">État</th>
              <th scope="col" className="text-right">Commandes</th>
              <th scope="col" className="text-right">Licences</th>
              <th scope="col">Inscription</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="max-w-[260px] truncate">
                  <Link href={`/admin/utilisateurs/${user.id}`} className="text-accent-text hover:underline">
                    {user.email}
                  </Link>
                </td>
                <td>{user.role === "ADMIN" ? <Badge variant="accent">Admin</Badge> : "Client"}</td>
                <td>
                  {user.blockedAt ? (
                    <Badge variant="error">Bloqué</Badge>
                  ) : user.emailVerifiedAt ? (
                    <Badge variant="success">Actif</Badge>
                  ) : (
                    <Badge variant="neutral">Non confirmé</Badge>
                  )}
                </td>
                <td className="text-right tabular-nums">{user.ordersCount}</td>
                <td className="text-right tabular-nums">{user.licensesCount}</td>
                <td className="whitespace-nowrap">{formatDateTime(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
