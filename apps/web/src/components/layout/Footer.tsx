import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const PLUGIN_LINKS = [
  { href: "/plugins/bedwars", label: "FondamentalBedwars" },
  { href: "/plugins/tag", label: "FondamentalTag" },
  { href: "/plugins/crate", label: "FondamentalCrate" },
  { href: "/plugins/pass", label: "FondamentalPass" },
];

const RESOURCE_LINKS = [
  { href: "/wiki", label: "Wiki" },
  { href: "/support", label: "Discord" },
  { href: "/support", label: "Contact" },
  { href: "/changelog", label: "Changelog" },
];

const LEGAL_LINKS = [
  { href: "/cgv", label: "CGV" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
];

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="mb-3 font-mono text-[.68rem] font-medium uppercase tracking-[.1em] text-muted">{title}</h4>
      <ul className="grid gap-2">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="text-[.9rem] hover:text-accent-text">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pied de page (`.ft` de la maquette). Mention Mojang obligatoire (brief §10). */
export function Footer() {
  return (
    <footer className="border-t border-line bg-surface px-4 py-10 sm:px-8">
      <div className="mx-auto grid max-w-[1120px] gap-7 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Logo />
          <p className="mt-3 max-w-[34ch] text-[.86rem] text-muted">
            Le socle de votre serveur. Des plugins Minecraft fiables, simples à installer et bien
            documentés.
          </p>
        </div>
        <FooterColumn title="Plugins" links={PLUGIN_LINKS} />
        <FooterColumn title="Ressources" links={RESOURCE_LINKS} />
        <FooterColumn title="Légal" links={LEGAL_LINKS} />
      </div>
      <div className="mx-auto mt-7 flex max-w-[1120px] flex-wrap justify-between gap-2 border-t border-line pt-4.5 text-[.8rem] text-muted">
        <span>© {new Date().getFullYear()} Fondamental Plugins</span>
        <span>
          Fondamental Plugins n&apos;est pas affilié à Mojang Studios ni à Microsoft. Minecraft
          est une marque de Mojang Studios.
        </span>
      </div>
    </footer>
  );
}
