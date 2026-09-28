"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { LEGAL_PAGES } from "./pages";

/** Navigation entre les pages légales (`.wtree` de la maquette). */
export function LegalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Pages légales" className="grid gap-0.5 rounded-card-lg border border-line bg-surface p-4">
      <p className="mb-1.5 font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Légal</p>
      {LEGAL_PAGES.map(({ href, navLabel }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "rounded-field px-3 py-2 text-[.9rem] font-medium text-muted hover:bg-surface-2 hover:text-text",
            pathname === href && "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-accent-text",
          )}
        >
          {navLabel}
        </Link>
      ))}
    </nav>
  );
}
