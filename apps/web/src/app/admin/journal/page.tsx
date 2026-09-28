"use client";

import { useState } from "react";
import Link from "next/link";
import { getActions } from "@/lib/api/admin";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { DocumentationIcon } from "@/components/icons";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { ACTION_LABEL, formatDateTime } from "@/features/admin/labels";
import { useAdminData } from "@/features/admin/useAdminData";

const TARGETS = [
  { value: "", label: "Toutes" },
  { value: "order", label: "Commandes" },
  { value: "license", label: "Licences" },
  { value: "product", label: "Produits" },
  { value: "user", label: "Utilisateurs" },
  { value: "release", label: "Versions" },
];

/** Lien vers la cible d'une action, quand elle a une page (jamais une clé de licence dans l'URL). */
function targetHref(targetType: string, targetId: string): string | null {
  if (targetType === "order") return `/admin/commandes/${targetId}`;
  if (targetType === "user") return `/admin/utilisateurs/${targetId}`;
  if (targetType === "product") return "/admin/produits";
  if (targetType === "release") return "/admin/versions";
  return null;
}

export default function AdminJournalPage() {
  const [targetType, setTargetType] = useState("");
  const { data: actions, error } = useAdminData(
    () => getActions({ targetType: targetType || undefined, limit: 200 }),
    [targetType],
  );

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Journal" description="Toutes les actions du back-office : qui, quoi, quand (200 dernières)." />
      <Field label="Type de cible" htmlFor="target" className="max-w-[220px]">
        <Select id="target" value={targetType} onChange={(e) => setTargetType(e.target.value)}>
          {TARGETS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      {error && <Alert variant="error">{error}</Alert>}
      {!actions && !error && <Skeleton className="h-48" />}
      {actions && actions.length === 0 && (
        <EmptyState icon={<DocumentationIcon width={26} height={26} />} title="Aucune action" />
      )}
      {actions && actions.length > 0 && (
        <Table>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Action</th>
              <th scope="col">Admin</th>
              <th scope="col">Cible</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => {
              const href = targetHref(a.targetType, a.targetId);
              // Clé de licence : seulement ses 4 derniers caractères à l'écran.
              const label = a.targetType === "license" ? `licence …${a.targetId.slice(-4)}` : `${a.targetType} ${a.targetId}`;
              return (
                <tr key={a.id}>
                  <td className="whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                  <td>{ACTION_LABEL[a.action] ?? a.action}</td>
                  <td className="max-w-[200px] truncate">{a.adminEmail}</td>
                  <td className="max-w-[240px] truncate">
                    {href ? (
                      <Link href={href} className="text-accent-text hover:underline">
                        {label}
                      </Link>
                    ) : (
                      label
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
