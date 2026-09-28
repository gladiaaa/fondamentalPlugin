"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  RapideIcon,
  PanierIcon,
  LicenceIcon,
  ServeurIcon,
  CompteIcon,
  TelechargerIcon,
  DocumentationIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/admin", label: "Tableau de bord", Icon: RapideIcon, exact: true },
  { href: "/admin/commandes", label: "Commandes", Icon: PanierIcon, exact: false },
  { href: "/admin/licences", label: "Licences", Icon: LicenceIcon, exact: false },
  { href: "/admin/produits", label: "Produits", Icon: ServeurIcon, exact: false },
  { href: "/admin/utilisateurs", label: "Utilisateurs", Icon: CompteIcon, exact: false },
  { href: "/admin/versions", label: "Versions", Icon: TelechargerIcon, exact: false },
  { href: "/admin/journal", label: "Journal", Icon: DocumentationIcon, exact: false },
];

/** Navigation latérale du back-office, sur le modèle de celle de l'espace client (`AccountNav`). */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="grid content-start gap-4 rounded-card-lg border border-line bg-surface p-4">
      <p className="border-b border-line pb-3 font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Back-office</p>
      <ul className="grid gap-0.5">
        {NAV_ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
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
