"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { OwnedLicenseResponse } from "@fondamental/shared";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LicenseKey } from "@/features/account/LicenseKey";
import { useSession } from "@/lib/session/SessionContext";
import { getLicenses, claimLicense } from "@/lib/api/account";
import { claimLicenseSchema, type ClaimLicenseValues } from "@/lib/validation/account";
import { ApiRequestError } from "@/lib/api/client";
import { LicenceIcon } from "@/components/icons";

export default function LicencesPage() {
  const { csrfToken } = useSession();
  const [licenses, setLicenses] = useState<OwnedLicenseResponse[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClaimLicenseValues>({ resolver: zodResolver(claimLicenseSchema) });

  function loadLicenses() {
    setLoadError(false);
    getLicenses()
      .then(setLicenses)
      .catch(() => setLoadError(true));
  }

  // Chargement initial : appelle directement l'API sans passer par
  // `loadLicenses` (son `setLoadError(false)` d'ouverture serait un
  // `setState` synchrone dans l'effet, ce que le linter refuse à raison —
  // ici l'état d'erreur démarre déjà à `false`, pas besoin de le remettre).
  useEffect(() => {
    getLicenses()
      .then(setLicenses)
      .catch(() => setLoadError(true));
  }, []);

  async function onSubmit(values: ClaimLicenseValues) {
    if (!csrfToken) return;
    setFormError(null);
    setClaimed(false);
    try {
      await claimLicense(values.key, csrfToken);
      setClaimed(true);
      reset();
      loadLicenses();
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "LICENSE_CLAIM_INVALID") {
        // Réponse volontairement identique pour clé inconnue, révoquée ou
        // déjà prise (docs/api-front.md §4) : le message ne distingue pas
        // non plus.
        setFormError("Cette clé n'a pas pu être rattachée : elle est inconnue, révoquée, ou déjà utilisée.");
      } else if (error instanceof ApiRequestError && error.code === "LICENSE_SERVER_UNAVAILABLE") {
        setFormError("Serveur de licences momentanément indisponible. Réessayez plus tard.");
      } else {
        setFormError("Une erreur inattendue s'est produite.");
      }
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Espace client</p>
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Mes licences</h1>
      </div>

      <div className="grid gap-3 rounded-card-lg border border-line bg-surface p-5">
        {licenses === null && !loadError && (
          <>
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </>
        )}
        {loadError && (
          <Alert variant="error" title="Vos licences n'ont pas pu être chargées">
            Réessayez dans un instant.
          </Alert>
        )}
        {licenses?.length === 0 && (
          <EmptyState
            icon={<LicenceIcon width={26} height={26} />}
            title="Aucune licence pour l'instant"
            description="Achetez un plugin ou rattachez une ancienne clé ci-dessous."
          />
        )}
        {licenses && licenses.length > 0 && (
          <ul className="grid gap-3">
            {licenses.map((license) => (
              <li key={license.id} className="grid gap-1.5">
                <LicenseKey value={license.key} />
                <small className="text-[.8rem] text-muted">
                  Rattachée le {new Date(license.claimedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  {" · "}
                  {/* Identifiant interne dans l'URL, jamais la clé (#91). */}
                  <Link href={`/compte/licences/${license.id}`} className="text-accent-text">
                    Voir le détail
                  </Link>
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 rounded-card-lg border border-line bg-surface p-5">
        <div className="grid gap-1">
          <h2 className="font-display text-[1.05rem] font-semibold">Vous avez déjà une clé de licence ?</h2>
          <p className="text-[.9rem] text-muted">
            Réservé aux clés créées avant la boutique. Une licence achetée sur le site se rattache automatiquement.
          </p>
        </div>
        {claimed && !formError && (
          <Alert variant="success" title="Clé rattachée">
            Elle apparaît maintenant dans la liste ci-dessus.
          </Alert>
        )}
        {formError && (
          <Alert variant="error" title="Rattachement impossible">
            {formError}
          </Alert>
        )}
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Field label="Clé de licence" htmlFor="key" error={errors.key?.message} className="min-w-[220px] flex-1">
            <Input id="key" placeholder="FBW-XXXX-XXXX-XXXX" {...register("key")} />
          </Field>
          <Button type="submit" loading={isSubmitting}>
            Rattacher
          </Button>
        </form>
      </div>
    </div>
  );
}
