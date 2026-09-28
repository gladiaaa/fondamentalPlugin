"use client";

import { useState, type ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";

/**
 * Action sensible confirmée **dans la page** (jamais `confirm()`, CLAUDE.md) : un premier clic affiche
 * la question et deux boutons, le second exécute. Les erreurs restent à la charge de `onConfirm`.
 */
export function ConfirmButton({
  children,
  question,
  confirmLabel,
  onConfirm,
  variant = "danger",
  disabled,
}: {
  children: ReactNode;
  question: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);

  if (!asking) {
    return (
      <Button size="sm" variant={variant === "danger" ? "secondary" : variant} disabled={disabled} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }

  return (
    <div role="group" className="grid gap-2 rounded-card border border-line bg-surface-2 p-3 text-[.9rem]">
      <p>{question}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={variant}
          loading={pending}
          onClick={async () => {
            setPending(true);
            try {
              await onConfirm();
            } finally {
              setPending(false);
              setAsking(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setAsking(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
