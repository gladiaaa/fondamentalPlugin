import type { ReactNode } from "react";
import Link from "next/link";
import { LEGAL_DRAFT, LEGAL_PAGES, LEGAL_UPDATED_AT } from "./pages";

/** Page légale (#35) : titre, date de mise à jour et sections numérotées (`LegalSection`). */
export function LegalArticle({ slug, children }: { slug: string; children: ReactNode }) {
  const page = LEGAL_PAGES.find((p) => p.slug === slug);
  if (!page) throw new Error(`Page légale inconnue : ${slug}`);
  return (
    <article className="legal grid gap-5 [counter-reset:legal]">
      <header className="grid gap-1.5">
        {LEGAL_DRAFT && (
          <p className="font-mono text-[.7rem] uppercase tracking-[.08em] text-warning">Brouillon · à faire valider</p>
        )}
        <h1 className="font-display text-[1.6rem] font-semibold tracking-[-.03em]">{page.title}</h1>
        <p className="text-[.88rem] text-muted">Dernière mise à jour : {LEGAL_UPDATED_AT}</p>
      </header>
      {children}
    </article>
  );
}

/** Section numérotée automatiquement (compteur CSS) : l'ordre des sections suffit. */
export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-24 gap-2.5 [counter-increment:legal]">
      <h2 className="font-display text-[1.08rem] font-semibold before:content-[counter(legal)_'._']">{title}</h2>
      <div className="grid gap-2.5 leading-relaxed text-text/90 [&_a]:text-accent-text [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}

/** Information obligatoire pas encore fournie : bien visible pour ne pas passer en prod sans elle. */
export function ACompleter({ children }: { children: ReactNode }) {
  return <span className="rounded bg-warning/15 px-1.5 py-0.5 font-medium text-warning">[À compléter : {children}]</span>;
}

/** Lien interne vers une autre page légale. */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href}>{children}</Link>;
}
