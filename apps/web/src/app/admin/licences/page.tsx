"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { AdminLicenseResponse } from "@fondamental/shared";
import { getLicense, recreateLicense, revokeLicense } from "@/lib/api/admin";
import { useSession } from "@/lib/session/SessionContext";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { LicenseKey } from "@/features/account/LicenseKey";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { ConfirmButton } from "@/features/admin/ConfirmButton";
import { formatDateTime } from "@/features/admin/labels";
import { adminErrorMessage } from "@/features/admin/useAdminData";

/**
 * Recherche par clé : la clé reste dans l'état de la page, jamais dans l'URL du site (brief, #106).
 * Les licences d'un client se retrouvent aussi depuis sa fiche (Utilisateurs).
 */
export default function AdminLicensesPage() {
  const { csrfToken } = useSession();
  const [input, setInput] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [license, setLicense] = useState<AdminLicenseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(target: string) {
    setError(null);
    setLoading(true);
    try {
      setLicense(await getLicense(target));
      setKey(target);
    } catch (err) {
      setLicense(null);
      setKey(null);
      setError(adminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setNewKey(null);
    const target = input.trim();
    if (target) void load(target);
  }

  return (
    <div className="grid gap-6">
      <AdminPageHeader title="Licences" description="Statut sur le serveur de licences, installations, révocation." />

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <Field label="Clé de licence" htmlFor="key" className="min-w-[280px] flex-1">
          <Input id="key" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" spellCheck={false} />
        </Field>
        <Button type="submit" variant="secondary" loading={loading}>
          Rechercher
        </Button>
      </form>

      {error && <Alert variant="error">{error}</Alert>}
      {newKey && (
        <Alert variant="success" title="Nouvelle clé créée">
          <p className="mb-2">L&apos;ancienne est révoquée. Transmettez celle-ci au client :</p>
          <LicenseKey value={newKey} />
        </Alert>
      )}

      {license && key && (
        <section className="grid gap-4 rounded-card-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={license.revoked ? "error" : "success"}>{license.revoked ? "Révoquée" : "Valide"}</Badge>
            <Badge variant="accent">{license.edition}</Badge>
          </div>
          <LicenseKey value={license.key} />
          <p className="text-[.9rem] text-muted">
            {license.ownerUserId ? (
              <>
                Rattachée à{" "}
                <Link href={`/admin/utilisateurs/${license.ownerUserId}`} className="text-accent-text hover:underline">
                  ce compte
                </Link>
                {license.claimedAt && ` depuis le ${formatDateTime(license.claimedAt)}`}.
              </>
            ) : (
              "Rattachée à aucun compte de la boutique."
            )}
          </p>

          <div className="grid gap-2">
            <h2 className="font-display text-[1rem] font-semibold">
              Installations ({license.activations.length})
            </h2>
            {license.activations.length === 0 ? (
              <p className="text-[.9rem] text-muted">Aucun serveur n&apos;utilise cette clé.</p>
            ) : (
              <ul className="grid gap-1 text-[.88rem]">
                {license.activations.map((a) => (
                  <li key={a.installationId}>
                    <code>{a.installationId}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!license.revoked && (
            <div className="flex flex-wrap items-start gap-3">
              <ConfirmButton
                question="Révoquer cette clé ? Les serveurs qui l'utilisent repasseront en édition gratuite."
                confirmLabel="Révoquer"
                onConfirm={async () => {
                  try {
                    await revokeLicense(key, csrfToken!);
                    toast.success("Clé révoquée.");
                    await load(key);
                  } catch (err) {
                    setError(adminErrorMessage(err));
                  }
                }}
              >
                Révoquer
              </ConfirmButton>
              <ConfirmButton
                variant="primary"
                question="Remplacer cette clé par une nouvelle (même commande) ? L'ancienne sera révoquée."
                confirmLabel="Recréer"
                onConfirm={async () => {
                  try {
                    const created = await recreateLicense(key, csrfToken!);
                    setNewKey(created.key);
                    setInput(created.key);
                    await load(created.key);
                  } catch (err) {
                    setError(adminErrorMessage(err));
                  }
                }}
              >
                Recréer une clé
              </ConfirmButton>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
