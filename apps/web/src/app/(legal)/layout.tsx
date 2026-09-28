import type { ReactNode } from "react";
import { LegalNav } from "@/features/legal/LegalNav";

/** Groupe de routes (parenthèses : pas de segment d'URL) pour les 4 pages légales (#35, #92). */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[900px] gap-6 md:grid-cols-[200px_1fr]">
        <LegalNav />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
