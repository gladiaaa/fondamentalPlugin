"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Table } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";
import { LicenseKey } from "@/features/account/LicenseKey";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { useSession } from "@/lib/session/SessionContext";
import { getLicenseDetail, releaseActivation, type LicenseDetail } from "@/lib/api/licenses";
import { ApiRequestError } from "@/lib/api/client";
import { PanierIcon, TelechargerIcon } from "@/components/icons";

/**
 * Détail d'une licence (#25 complet, simulé via MSW, #90). L'URL porte la
 * clé en clair aujourd'hui, faute d'identifiant interne dans le contrat
 * indicatif (voir la note dans lib/api/licenses.ts et l'issue #91).
 */
export default function LicenseDetailPage() {
  const { key } = useParams<{ key: string }>();
  const { csrfToken } = useSession();
  const [license, setLicense] = useState<LicenseDetail | null>(null);
  const [notFoundError, setNotFoundError] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  function load() {
    getLicenseDetail(key).then(setLicense).catch(() => setNotFoundError(true));
  }

  useEffect(load, [key]);

  async function handleRelease(installationId: string) {
    if (!csrfToken) return;
    setReleasing(true);
    try {
      await releaseActivation(key, installationId, csrfToken);
      setConfirmingId(null);
      load();
    } catch (error) {
      if (!(error instanceof ApiRequestError)) throw error;
    } finally {
      setReleasing(false);
    }
  }

  if (notFoundError) notFound();

  const Icon = license ? (PLUGIN_ICONS[license.product.slug] ?? PanierIcon) : null;

  return (
    <div className="grid gap-6">
      <nav className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">
        <Link href="/compte/licences" className="hover:text-text">
          Mes licences
        </Link>
        {license && <> / <span className="text-text">{license.product.name}</span></>}
      </nav>

      {!license ? (
        <div className="grid gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3.5">
            {Icon && <Icon width={52} height={52} />}
            <div className="grid gap-1">
              <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">{license.product.name}</h1>
              <div className="flex gap-2">
                <Badge variant={license.status === "ACTIVE" ? "success" : "error"}>
                  {license.status === "ACTIVE" ? "Active" : "Révoquée"}
                </Badge>
                <Badge variant="accent">Premium</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-card-lg border border-line bg-surface p-5">
            <div className="grid gap-1.5">
              <small className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Clé de licence</small>
              <LicenseKey value={license.key} />
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Achetée le</dt>
                <dd>{new Date(license.purchasedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</dd>
              </div>
              <div>
                <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Installations</dt>
                <dd>
                  {license.activationsUsed} / {license.activationsMax}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2.5">
              <Button asChild>
                <Link href={`/plugins/${license.product.slug}`}>
                  <TelechargerIcon width={18} height={18} /> Télécharger le plugin
                </Link>
              </Button>
              <Button variant="secondary" disabled>
                Générer mon config.yml (bientôt disponible)
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <h2 className="font-display text-[1.05rem] font-semibold">Installations</h2>
            {license.activations.length === 0 ? (
              <p className="text-muted">Aucune installation pour l&apos;instant.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th scope="col">Identifiant</th>
                    <th scope="col">Première connexion</th>
                    <th scope="col">Dernière connexion</th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {license.activations.map((activation) => (
                    <tr key={activation.id}>
                      <td>
                        <code className="font-mono text-[.85rem]">{activation.id}</code>
                      </td>
                      <td>{new Date(activation.firstSeenAt).toLocaleDateString("fr-FR")}</td>
                      <td>{new Date(activation.lastSeenAt).toLocaleDateString("fr-FR")}</td>
                      <td className="text-right">
                        {confirmingId === activation.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[.85rem] text-muted">Libérer cette installation ?</span>
                            <Button size="sm" variant="secondary" onClick={() => setConfirmingId(null)}>
                              Annuler
                            </Button>
                            <Button size="sm" variant="danger" loading={releasing} onClick={() => handleRelease(activation.id)}>
                              Libérer
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setConfirmingId(activation.id)}>
                            Libérer
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <Alert variant="info">
              Libérer une installation la retire de votre décompte : vous pouvez alors activer la clé sur un autre serveur.
            </Alert>
          </div>
        </>
      )}
    </div>
  );
}
