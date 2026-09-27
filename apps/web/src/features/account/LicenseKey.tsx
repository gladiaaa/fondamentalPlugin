"use client";

import { useState } from "react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/IconButton";
import { OeilIcon, OeilFermeIcon, CopieIcon } from "@/components/icons";

/** Clé de licence masquée par défaut, avec Afficher/Copier (brief §10). */
export function LicenseKey({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    toast.success("Clé copiée.");
  }

  return (
    <div className="flex items-center gap-1.5">
      <code className="min-w-0 flex-1 truncate rounded-field bg-surface-2 px-3 py-1.5 font-mono text-[.86rem] tracking-[.02em]">
        {visible ? value : "•".repeat(Math.min(value.length, 20))}
      </code>
      <IconButton
        label={visible ? "Masquer la clé" : "Afficher la clé"}
        icon={visible ? <OeilFermeIcon /> : <OeilIcon />}
        onClick={() => setVisible((v) => !v)}
      />
      <IconButton label="Copier la clé" icon={<CopieIcon />} onClick={handleCopy} />
    </div>
  );
}
