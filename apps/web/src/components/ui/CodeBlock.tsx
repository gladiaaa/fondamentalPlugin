"use client";

import { toast } from "sonner";
import { IconButton } from "./IconButton";
import { cn } from "@/lib/cn";
import { CopieIcon } from "@/components/icons";

// `--code`/`--codetx` n'existent que dans le CSS de la maquette, pas dans
// fondamental-jetons.css (charte) : ce bloc de code a son propre fond, très
// sombre y compris en thème clair (comme la maquette), pour rester lisible
// avec de la coloration syntaxique.
const CODE_BG = "#0B0812";
const CODE_TEXT = "#D8D2E6";

export function CodeBlock({
  code,
  copyLabel = "Copier",
  className,
}: {
  code: string;
  /** Texte du toast affiché après la copie (brief §8 : retours brefs). */
  copyLabel?: string;
  className?: string;
}) {
  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    toast.success(`${copyLabel} copié.`);
  }

  return (
    <div className="relative">
      <pre
        className={cn("overflow-x-auto rounded-card border border-[#2A2338] p-4 font-mono text-[.84rem] leading-[1.75]", className)}
        style={{ background: CODE_BG, color: CODE_TEXT }}
      >
        <code>{code}</code>
      </pre>
      <IconButton
        label="Copier"
        icon={<CopieIcon />}
        onClick={handleCopy}
        className="absolute right-2 top-2 size-[34px] border-[#2A2338] bg-[#1A1625] text-[#D8D2E6]"
      />
    </div>
  );
}
