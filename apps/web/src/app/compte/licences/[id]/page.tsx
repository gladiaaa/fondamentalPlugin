"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import type { LicenseDetailResponse } from "@fondamental/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Table } from "@/components/ui/Table";
import { Skeleton } from "@/components/ui/Skeleton";
import { LicenseKey } from "@/features/account/LicenseKey";
import { PLUGIN_ICONS } from "@/features/plugins/icons";
import { useSession } from "@/lib/session/SessionContext";
import { getLicenseDetail, releaseActivation } from "@/lib/api/licenses";
import { ApiRequestError } from "@/lib/api/client";
import { LicenceIcon, TelechargerIcon } from "@/components/icons";

const EDITIONS: Record<string, string> = { PREMIUM: "Premium", UNIVERSAL: "Universelle", FREE: "Gratuite" };

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Statut affiché : révoquée prime sur expirée. */
function licenseState(license: LicenseDetailResponse): { label: string; variant: "success" | "error" | "warning" } {
  if (license.revoked) return { label: "Révoquée", variant: "error" };
  if (license.expiresAt && new Date(license.expiresAt) < new Date()) return { label: "Expirée", variant: "warning" };
  return { label: "Active", variant: "success" };
}

/**
 * Détail d'une licence (#25) : statut, clé, installations et libération. L'URL porte l'identifiant
 * interne de la licence, jamais la clé (#91).
 */
export default function LicenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { csrfToken } = useSession();
  const [license, setLicense] = useState<LicenseDetailResponse | null>(null);
  const [notFoundError, setNotFoundError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const load = useCallback(() => {
    getLicenseDetail(id)
      .then((detail) => {
        setLicense(detail);
        setLoadError(false);
      })
      .catch((error) => {
        if (error instanceof ApiRequestError && error.statusCode === 404) setNotFoundError(true);
        else setLoadError(true);
      });
  }, [id]);

  useEffect(load, [load]);

  async function handleRelease(installationId: string) {
    if (!csrfToken) return;
    setReleasing(true);
    setReleaseError(null);
    try {
      await releaseActivation(id, installationId, csrfToken);
      setConfirmingId(null);
      toast("Installation libérée");
      load();
    } catch (error) {
      setReleaseError(
        error instanceof ApiRequestError && error.code === "LICENSE_SERVER_UNAVAILABLE"
          ? "Serveur de licences momentanément indisponible. Réessayez plus tard."
          : "L'installation n'a pas pu être libérée. Rechargez la page et réessayez.",
      );
    } finally {
      setReleasing(false);
    }
  }

  if (notFoundError) notFound();

  const name = license?.product?.name ?? "Licence";
  const Icon = (license?.product && PLUGIN_ICONS[license.product.slug]) || LicenceIcon;
  const state = license ? licenseState(license) : null;

  return (
    <div className="grid gap-6">
      <nav className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">
        <Link href="/compte/licences" className="hover:text-text">
          Mes licences
        </Link>
        {license && <> / <span className="text-text">{name}</span></>}
      </nav>

      {loadError && !license && (
        <Alert variant="error" title="Cette licence n'a pas pu être chargée">
          Le serveur de licences ne répond pas pour le moment. Réessayez dans un instant.
        </Alert>
      )}

      {!license ? (
        !loadError && (
          <div className="grid gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
          </div>
        )
      ) : (
        <>
          <div className="flex items-center gap-3.5">
            <Icon width={52} height={52} />
            <div className="grid gap-1">
              <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">{name}</h1>
              <div className="flex gap-2">
                {state && <Badge variant={state.variant}>{state.label}</Badge>}
                <Badge variant="accent">{EDITIONS[license.edition] ?? license.edition}</Badge>
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
                <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Dans votre compte depuis</dt>
                <dd>{longDate(license.claimedAt)}</dd>
              </div>
              <div>
                <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Installations</dt>
                <dd>
                  {license.activations.length} / {license.maxActivations}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Validité</dt>
                <dd>{license.expiresAt ? `Jusqu'au ${longDate(license.expiresAt)}` : "Sans limite de durée"}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2.5">
              {license.product && (
                <Button asChild>
                  <Link href={`/plugins/${license.product.slug}`}>
                    <TelechargerIcon width={18} height={18} /> Télécharger le plugin
                  </Link>
                </Button>
              )}
              <Button variant="secondary" disabled>
                Générer mon config.yml (bientôt disponible)
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <h2 className="font-display text-[1.05rem] font-semibold">Installations</h2>
            {releaseError && (
              <Alert variant="error" title="Libération impossible">
                {releaseError}
              </Alert>
            )}
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
                    <tr key={activation.installationId}>
                      <td>
                        <code className="font-mono text-[.85rem]">{activation.installationId}</code>
                      </td>
                      <td>{new Date(activation.firstSeenAt).toLocaleDateString("fr-FR")}</td>
                      <td>{new Date(activation.lastSeenAt).toLocaleDateString("fr-FR")}</td>
                      <td className="text-right">
                        {confirmingId === activation.installationId ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[.85rem] text-muted">Libérer cette installation ?</span>
                            <Button size="sm" variant="secondary" onClick={() => setConfirmingId(null)}>
                              Annuler
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              loading={releasing}
                              onClick={() => handleRelease(activation.installationId)}
                            >
                              Libérer
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setConfirmingId(activation.installationId)}>
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
