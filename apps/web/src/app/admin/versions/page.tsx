"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { AdminReleaseResponse } from "@fondamental/shared";
import { getAdminProducts, getReleases, updateRelease } from "@/lib/api/admin";
import { useSession } from "@/lib/session/SessionContext";
import { formatFileSize } from "@/lib/format";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table } from "@/components/ui/Table";
import { TelechargerIcon } from "@/components/icons";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { ConfirmButton } from "@/features/admin/ConfirmButton";
import { formatDateTime } from "@/features/admin/labels";
import { adminErrorMessage, useAdminData } from "@/features/admin/useAdminData";

const EDITION_LABEL = { UNIVERSAL: "Unique", FREE: "Gratuit", PREMIUM: "Premium" } as const;

function ReleaseCard({ release, onSaved }: { release: AdminReleaseResponse; onSaved: (r: AdminReleaseResponse) => void }) {
  const { csrfToken } = useSession();
  const [changelog, setChangelog] = useState(release.changelog);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const downloads = release.files.reduce((sum, f) => sum + f.downloadCount, 0);

  async function save(patch: Parameters<typeof updateRelease>[1], done: string) {
    if (!csrfToken) return;
    setError(null);
    setSaving(true);
    try {
      onSaved(await updateRelease(release.id, patch, csrfToken));
      toast.success(done);
      setEditing(false);
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="grid gap-4 rounded-card-lg border border-line bg-surface p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-[1.1rem] font-semibold">
            {release.productSlug} {release.version}
          </h2>
          <Badge variant={release.channel === "BETA" ? "warning" : "neutral"}>{release.channel === "BETA" ? "Bêta" : "Stable"}</Badge>
          {release.hiddenAt && <Badge variant="error">Masquée</Badge>}
        </div>
        <span className="text-[.85rem] text-muted">
          {formatDateTime(release.releasedAt)} · {downloads} téléchargement{downloads > 1 ? "s" : ""}
        </span>
      </header>

      <Table>
        <thead>
          <tr>
            <th scope="col">Fichier</th>
            <th scope="col">Édition</th>
            <th scope="col">Minecraft</th>
            <th scope="col" className="text-right">Taille</th>
            <th scope="col" className="text-right">Téléch.</th>
          </tr>
        </thead>
        <tbody>
          {release.files.map((file) => (
            <tr key={file.id}>
              <td className="max-w-[280px] truncate" title={`SHA-256 ${file.sha256}`}>
                {file.fileName}
              </td>
              <td>{EDITION_LABEL[file.edition]}</td>
              <td>{file.minecraftVersions.join(", ") || "—"}</td>
              <td className="text-right tabular-nums">{formatFileSize(file.sizeBytes)}</td>
              <td className="text-right tabular-nums">{file.downloadCount}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {editing ? (
        <div className="grid gap-3">
          <Field label="Changelog" htmlFor={`log-${release.id}`}>
            <Textarea id={`log-${release.id}`} rows={6} value={changelog} onChange={(e) => setChangelog(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" loading={saving} onClick={() => save({ changelog }, "Changelog enregistré.")}>
              Enregistrer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setChangelog(release.changelog);
                setEditing(false);
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-[.9rem] text-muted">{release.changelog || "Pas de changelog."}</p>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex flex-wrap items-start gap-3">
        {!editing && (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Modifier le changelog
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          loading={saving && !editing}
          onClick={() =>
            save(
              { channel: release.channel === "BETA" ? "RELEASE" : "BETA" },
              release.channel === "BETA" ? "Passée en stable." : "Passée en bêta.",
            )
          }
        >
          {release.channel === "BETA" ? "Passer en stable" : "Passer en bêta"}
        </Button>
        {release.hiddenAt ? (
          <ConfirmButton
            variant="primary"
            question="Réafficher cette version ? Elle redevient téléchargeable sur le site."
            confirmLabel="Réafficher"
            onConfirm={() => save({ hidden: false }, "Version réaffichée.")}
          >
            Réafficher
          </ConfirmButton>
        ) : (
          <ConfirmButton
            question="Masquer cette version ? Elle disparaît de la page du plugin et ses fichiers ne se téléchargent plus."
            confirmLabel="Masquer"
            onConfirm={() => save({ hidden: true }, "Version masquée.")}
          >
            Masquer
          </ConfirmButton>
        )}
      </div>
    </article>
  );
}

export default function AdminReleasesPage() {
  const [product, setProduct] = useState("");
  const { data: products } = useAdminData(getAdminProducts);
  const { data: releases, error, setData } = useAdminData(() => getReleases(product || undefined), [product]);

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        title="Versions"
        description="Publiées par la CI de chaque plugin. Masquer une version la retire du site sans supprimer ses fichiers."
      />
      <Field label="Plugin" htmlFor="product" className="max-w-[260px]">
        <Select id="product" value={product} onChange={(e) => setProduct(e.target.value)}>
          <option value="">Tous les plugins</option>
          {products?.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      {error && <Alert variant="error">{error}</Alert>}
      {!releases && !error && <Skeleton className="h-64" />}
      {releases && releases.length === 0 && (
        <EmptyState icon={<TelechargerIcon width={26} height={26} />} title="Aucune version" description="Rien n'a encore été publié." />
      )}
      {releases?.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          onSaved={(saved) => setData(releases.map((r) => (r.id === saved.id ? saved : r)))}
        />
      ))}
    </div>
  );
}
