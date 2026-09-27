"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session/SessionContext";
import { getLicenses } from "@/lib/api/account";
import { Skeleton } from "@/components/ui/Skeleton";
import { LicenceIcon, ParametresIcon, DocumentationIcon } from "@/components/icons";

/**
 * Aperçu du compte : uniquement des données réelles (e-mail, date de
 * création, nombre de licences). Pas le tableau de bord à KPI de la
 * maquette (installations, dernière commande…) : ces données n'existent pas
 * encore côté API (#25, #23/#24).
 */
export default function ComptePage() {
  const { user } = useSession();
  const [licenseCount, setLicenseCount] = useState<number | null>(null);

  useEffect(() => {
    getLicenses()
      .then((licenses) => setLicenseCount(licenses.length))
      .catch(() => setLicenseCount(0));
  }, []);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Espace client</p>
        <h1 className="font-display text-[1.6rem] font-semibold tracking-[-.03em]">Bonjour</h1>
        <p className="text-muted">
          {user?.email} · membre depuis{" "}
          {user ? new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : ""}
        </p>
      </div>

      <div className="rounded-card-lg border border-line bg-surface p-5">
        <small className="font-mono text-[.7rem] uppercase tracking-[.08em] text-muted">Licences</small>
        {licenseCount === null ? (
          <Skeleton className="mt-1.5 h-8 w-16" />
        ) : (
          <b className="mt-1 block font-display text-[1.8rem] font-semibold tabular-nums">{licenseCount}</b>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/compte/licences"
          className="grid gap-2 rounded-card-lg border border-line bg-surface p-5 hover:border-accent"
        >
          <LicenceIcon width={22} height={22} className="text-accent-text" />
          <b className="font-display">Mes licences</b>
          <span className="text-[.88rem] text-muted">Voir vos clés ou en rattacher une ancienne.</span>
        </Link>
        <Link
          href="/compte/parametres"
          className="grid gap-2 rounded-card-lg border border-line bg-surface p-5 hover:border-accent"
        >
          <ParametresIcon width={22} height={22} className="text-accent-text" />
          <b className="font-display">Paramètres</b>
          <span className="text-[.88rem] text-muted">Mot de passe, sessions, données du compte.</span>
        </Link>
        <Link
          href="/wiki"
          className="grid gap-2 rounded-card-lg border border-line bg-surface p-5 hover:border-accent sm:col-span-2"
        >
          <DocumentationIcon width={22} height={22} className="text-accent-text" />
          <b className="font-display">Documentation</b>
          <span className="text-[.88rem] text-muted">Guides d&apos;installation et dépannage.</span>
        </Link>
      </div>
    </div>
  );
}
