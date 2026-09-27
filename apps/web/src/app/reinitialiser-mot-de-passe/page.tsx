"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { StateIcon } from "@/features/auth/StateIcon";
import { ErreurIcon } from "@/components/icons";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation/auth";
import { resetPassword } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense
      fallback={
        <section className="grid place-items-center px-4 py-[clamp(48px,10vw,96px)]">
          <Spinner />
        </section>
      }
    >
      <ReinitialiserMotDePasseContent />
    </Suspense>
  );
}

function ReinitialiserMotDePasseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token] = useState(() => searchParams.get("token"));
  const [formError, setFormError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (token) window.history.replaceState(null, "", "/reinitialiser-mot-de-passe");
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values: ResetPasswordValues) {
    if (!token) return;
    setFormError(null);
    try {
      await resetPassword(token, values.password);
      router.push("/connexion");
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "INVALID_LINK") {
        setExpired(true);
        return;
      }
      setFormError(error instanceof ApiRequestError ? error.message : "Une erreur inattendue s'est produite.");
    }
  }

  if (!token || expired) {
    return (
      <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
        <div className="mx-auto grid max-w-[440px] gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
          <StateIcon variant="error">
            <ErreurIcon width={28} height={28} />
          </StateIcon>
          <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Ce lien n&apos;est plus valable</h1>
          <p className="text-muted">Il a expiré ou a déjà été utilisé. Demandez un nouveau lien.</p>
          <Button asChild size="lg" fullWidth>
            <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[440px] gap-5 rounded-card-lg border border-line bg-surface p-8">
        <div className="grid gap-1.5">
          <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Nouveau mot de passe</h1>
          <p className="text-muted">Choisissez un mot de passe de 10 à 128 caractères.</p>
        </div>
        {formError && (
          <Alert variant="error" title="Échec de la réinitialisation">
            {formError}
          </Alert>
        )}
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <PasswordField
            label="Nouveau mot de passe"
            placeholder="10 caractères minimum"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordField
            label="Confirmer le mot de passe"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            Enregistrer le mot de passe
          </Button>
        </form>
      </div>
    </section>
  );
}
