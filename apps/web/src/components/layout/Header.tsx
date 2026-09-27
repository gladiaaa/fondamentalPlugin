"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session/SessionContext";
import {
  MenuIcon,
  FermerIcon,
  ChevronBasIcon,
  CompteIcon,
  LicenceIcon,
  DeconnexionIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  { href: "/plugins", label: "Plugins" },
  { href: "/wiki", label: "Wiki" },
  { href: "/support", label: "Support" },
];

/** En-tête du site (`.hd` de la maquette). Lit la session réelle (`SessionProvider`, layout.tsx). */
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, logout } = useSession();
  const session = status === "authenticated" && user ? { initial: user.email[0]?.toUpperCase() ?? "?" } : null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="relative flex items-center gap-[18px] border-b border-line bg-bg px-4 py-3.5 sm:px-8">
      <Logo />
      <nav aria-label="Navigation principale" className="ml-6 hidden gap-1.5 md:flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-pill px-[.9em] py-[.5em] text-[.92rem] font-medium text-muted hover:text-text",
                active && "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-accent-text font-semibold",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative ml-auto flex items-center gap-2.5">
        {status === "loading" ? (
          // Ni « Se connecter » ni le menu du compte tant que le GET
          // /auth/me initial n'a pas répondu : éviter le flash visiteur sur
          // un compte déjà connecté (une simple réservation de place, sans
          // contenu qui clignote).
          <span aria-hidden="true" className="hidden h-9 w-[110px] md:block" />
        ) : session === null ? (
          <Button variant="secondary" size="sm" asChild className="hidden md:inline-flex">
            <Link href="/connexion">Se connecter</Link>
          </Button>
        ) : (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Menu du compte"
                className="hidden items-center gap-2 rounded-pill border border-line bg-surface py-1 pl-1 pr-2.5 hover:border-accent md:flex"
              >
                <span className="grid size-9 place-items-center rounded-full bg-accent font-display text-[.9rem] font-semibold text-on-accent">
                  {session.initial}
                </span>
                <ChevronBasIcon className="text-muted" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={10}
                className="z-30 min-w-[210px] rounded-card border border-line bg-surface p-2 shadow-[0_18px_40px_rgba(0,0,0,.35)]"
              >
                <DropdownMenu.Item asChild>
                  <Link href="/compte" className="flex items-center gap-2.5 rounded-field px-3 py-2.5 text-[.9rem] outline-none hover:bg-surface-2 data-[highlighted]:bg-surface-2">
                    <CompteIcon /> Mon compte
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <Link href="/compte/licences" className="flex items-center gap-2.5 rounded-field px-3 py-2.5 text-[.9rem] outline-none hover:bg-surface-2 data-[highlighted]:bg-surface-2">
                    <LicenceIcon /> Mes licences
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={handleLogout}
                  className="flex items-center gap-2.5 rounded-field px-3 py-2.5 text-[.9rem] outline-none hover:bg-surface-2 data-[highlighted]:bg-surface-2 cursor-pointer"
                >
                  <DeconnexionIcon /> Déconnexion
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}

        <button
          type="button"
          aria-label={drawerOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={drawerOpen}
          aria-controls="menu-mobile"
          onClick={() => setDrawerOpen((v) => !v)}
          className="grid size-10 place-items-center rounded-field border-[1.5px] border-line bg-surface text-text md:hidden"
        >
          {drawerOpen ? <FermerIcon /> : <MenuIcon />}
        </button>
      </div>

      {drawerOpen && (
        <div
          id="menu-mobile"
          className="absolute inset-x-0 top-full grid gap-0.5 border-b border-line bg-bg px-4 py-2.5 md:hidden"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeDrawer}
              className="border-b border-line py-3 font-medium"
            >
              {item.label}
            </Link>
          ))}
          {session === null ? (
            <Button asChild className="mt-3">
              <Link href="/connexion" onClick={closeDrawer}>
                Se connecter
              </Link>
            </Button>
          ) : (
            <Link href="/compte" onClick={closeDrawer} className="py-3 font-medium">
              Mon compte
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
