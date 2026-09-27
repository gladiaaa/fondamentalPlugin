"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, Input } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthSplit } from "@/features/auth/AuthSplit";
import { OAuthButtons } from "@/features/auth/OAuthButtons";
import { useSession } from "@/lib/session/SessionContext";
import { loginSchema, type LoginValues } from "@/lib/validation/auth";
import { login, resendVerification } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";

export default function ConnexionPage() {
  const router = useRouter();
  const { setSession } = useSession();
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    setUnverifiedEmail(null);
    try {
      const { user, csrfToken } = await login(values.email, values.password);
      setSession(user, csrfToken);
      router.push("/");
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(values.email);
        return;
      }
      // Volontairement générique (mauvais mot de passe ou compte inconnu) : l'API ne distingue pas (§4).
      setFormError(error instanceof ApiRequestError ? error.message : "Une erreur inattendue s'est produite.");
    }
  }

  async function handleResend() {
    if (!unverifiedEmail) return;
    setResent(false);
    try {
      await resendVerification(unverifiedEmail);
      setResent(true);
    } catch {
      // Une minute minimum entre deux envois (§4) : l'erreur reste discrète, pas de blocage de l'UI.
    }
  }

  return (
    <AuthSplit
      pitch="Content de vous revoir."
      ticks={["Vos licences et vos clés", "Les téléchargements de vos plugins", "Le générateur de config.yml"]}
      title="Connexion"
      lead="Retrouvez vos licences et vos téléchargements."
      footer={
        <p className="text-center text-muted">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-accent-text">
            Créer un compte
          </Link>
        </p>
      }
    >
      <OAuthButtons />
      <div className="flex items-center gap-3 text-[.8rem] text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        ou
      </div>

      {unverifiedEmail && (
        <Alert variant="warning" title="Adresse non confirmée">
          <p>Confirmez d&apos;abord {unverifiedEmail} avant de vous connecter.</p>
          <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={handleResend}>
            {resent ? "E-mail renvoyé" : "Renvoyer le lien"}
          </Button>
        </Alert>
      )}
      {formError && (
        <Alert variant="error" title="Connexion impossible">
          {formError}
        </Alert>
      )}

      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Adresse e-mail" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <PasswordField
          label="Mot de passe"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="text-right">
          <Link href="/mot-de-passe-oublie" className="text-[.88rem] text-accent-text">
            Mot de passe oublié ?
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Se connecter
        </Button>
      </form>
    </AuthSplit>
  );
}
