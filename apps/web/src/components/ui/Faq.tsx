import type { ReactNode } from "react";
import { PlusIcon } from "@/components/icons";

export interface FaqEntry {
  question: ReactNode;
  answer: ReactNode;
}

/** FAQ en `<details>`/`<summary>` natifs (`.faq` de la maquette, brief §7 : pas de Radix ici). */
export function Faq({ entries }: { entries: FaqEntry[] }) {
  return (
    <div className="grid gap-2.5">
      {entries.map((entry, i) => (
        <details key={i} className="group rounded-card border border-line bg-surface">
          <summary className="flex list-none cursor-pointer items-center justify-between gap-3 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span>{entry.question}</span>
            <span className="text-accent transition-transform duration-200 group-open:rotate-45">
              <PlusIcon />
            </span>
          </summary>
          <p className="max-w-[64ch] px-5 pb-[18px] text-muted">{entry.answer}</p>
        </details>
      ))}
    </div>
  );
}
