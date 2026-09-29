"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session/SessionContext";
import { CompteIcon, LicenceIcon, ParametresIcon, GenerateurIcon } from "@/components/icons";

const NAV_ITEMS = [
  { href: "/compte", label: "Mon compte", Icon: CompteIcon, exact: true },
  { href: "/compte/licences", label: "Mes licences", Icon: LicenceIcon, exact: false },
  { href: "/configurateur", label: "Configurateur", Icon: GenerateurIcon, exact: false },
  { href: "/compte/parametres", label: "Paramètres", Icon: ParametresIcon, exact: false },
];

/**
 * Navigation latérale de l'espace client (`.acc-n` de la maquette), réduite
 * aux sections que l'API livre déjà ou dont la structure est posée en
 * squelette (#92) : pas de « Commandes », aucune route même indicative
 * (docs/api-front.md §7).
 */
export function AccountNav() {
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <nav aria-label="Espace client" className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-card-lg border border-line bg-surface p-4">
      <div className="flex min-w-0 items-center gap-2.5 border-b border-line pb-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-display text-[.9rem] font-semibold text-on-accent">
          {user?.email[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="min-w-0 truncate text-[.88rem] text-muted">{user?.email}</span>
      </div>
      <ul className="grid gap-0.5">
        {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-field px-3 py-2.5 text-[.9rem] font-medium text-muted hover:bg-surface-2 hover:text-text",
                  active && "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-accent-text",
                )}
              >
                <Icon /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
