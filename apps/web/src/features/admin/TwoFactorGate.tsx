"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { TwoFactorSetupResponse, TwoFactorStatusResponse } from "@fondamental/shared";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Field, Input } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { useSession } from "@/lib/session/SessionContext";
import { ApiRequestError } from "@/lib/api/client";
import { getTwoFactorStatus, setupTwoFactor, verifyTwoFactor } from "@/lib/api/admin";
import { adminErrorMessage } from "./useAdminData";

/**
 * Double authentification du back-office (#32) : la première fois, mise en place (QR code généré dans
 * le navigateur : le secret ne part vers aucun service tiers) ; ensuite, un code à chaque nouvelle
 * session. Rien du back-office ne s'affiche avant.
 */
export function TwoFactorGate({ children }: { children: ReactNode }) {
  const { csrfToken } = useSession();
  const [status, setStatus] = useState<TwoFactorStatusResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getTwoFactorStatus()
      .then(setStatus)
      .catch((error) => setLoadError(adminErrorMessage(error)));
  }, []);

  // Première fois : un secret est généré dès l'arrivée sur l'écran de mise en place.
  useEffect(() => {
    if (!status || status.enabled || setup || !csrfToken) return;
    setupTwoFactor(csrfToken)
      .then(setSetup)
      .catch((error) => setLoadError(adminErrorMessage(error)));
  }, [status, setup, csrfToken]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-[460px]">
        <Alert variant="error" title="Back-office indisponible">
          {loadError}
        </Alert>
      </div>
    );
  }
  if (!status) return <Spinner className="mx-auto" />;
  if (status.verifiedForSession) return <>{children}</>;

  const digits = code.replace(/\s/g, "");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!csrfToken) return;
    setFormError(null);
    setPending(true);
    try {
      await verifyTwoFactor(digits, csrfToken);
      setStatus({ enabled: true, verifiedForSession: true });
    } catch (error) {
      setFormError(
        error instanceof ApiRequestError && error.code === "TOTP_INVALID_CODE"
          ? "Code incorrect ou expiré : saisissez celui qui est affiché maintenant dans l'application."
          : adminErrorMessage(error),
      );
    } finally {
      setPending(false);
    }
  }

  const firstTime = !status.enabled;
  return (
    <div className="mx-auto grid max-w-[460px] gap-5 rounded-card-lg border border-line bg-surface p-6">
      <div className="grid gap-1.5">
        <h1 className="font-display text-[1.3rem] font-semibold tracking-[-.03em]">
          {firstTime ? "Activer la double authentification" : "Double authentification"}
        </h1>
        <p className="text-[.92rem] text-muted">
          {firstTime
            ? "Obligatoire pour le back-office. Scannez ce QR code avec une application d'authentification (Aegis, Google Authenticator, 1Password…), puis saisissez le code à 6 chiffres qu'elle affiche."
            : "Saisissez le code à 6 chiffres affiché par votre application d'authentification. Il est demandé à chaque nouvelle connexion."}
        </p>
      </div>

      {firstTime &&
        (setup ? (
          <div className="grid justify-items-center gap-3">
            <div className="rounded-card bg-white p-3">
              <QRCodeSVG value={setup.otpauthUrl} size={184} marginSize={0} title="QR code de la double authentification" />
            </div>
            <details className="w-full text-[.88rem]">
              <summary className="cursor-pointer text-muted">Impossible de scanner ? Saisir la clé à la main</summary>
              <div className="mt-2">
                <CodeBlock code={setup.secret} />
              </div>
            </details>
          </div>
        ) : (
          <Spinner className="mx-auto" />
        ))}

      <form className="grid gap-3" onSubmit={onSubmit} noValidate>
        <Field label="Code à 6 chiffres" htmlFor="totp" error={formError ?? undefined}>
          <Input
            id="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
        </Field>
        <Button type="submit" fullWidth loading={pending} disabled={digits.length !== 6 || (firstTime && !setup)}>
          Valider
        </Button>
      </form>
    </div>
  );
}
