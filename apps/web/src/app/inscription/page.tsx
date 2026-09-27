"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, Input } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthSplit } from "@/features/auth/AuthSplit";
import { OAuthButtons } from "@/features/auth/OAuthButtons";
import { registerSchema, type RegisterValues } from "@/lib/validation/auth";
import { register as apiRegister } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";

export default function InscriptionPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);
    try {
      await apiRegister(values.email, values.password);
      // La réponse est volontairement identique que l'adresse existe déjà ou
      // non (docs/api-front.md §4) : on va toujours vers l'écran d'attente.
      router.push(`/verifier-email?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      setFormError(error instanceof ApiRequestError ? error.message : "Une erreur inattendue s'est produite.");
    }
  }

  return (
    <AuthSplit
      pitch="Un compte, tous vos plugins."
      ticks={["Une clé par plugin acheté", "Installations libérables à tout moment", "Aucune carte enregistrée sur ce site"]}
      title="Créer un compte"
      lead="Un compte suffit pour acheter, télécharger et gérer vos licences."
      footer={
        <p className="text-center text-muted">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="text-accent-text">
            Se connecter
          </Link>
        </p>
      }
    >
      <OAuthButtons />
      <div className="flex items-center gap-3 text-[.8rem] text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        ou
      </div>

      {formError && (
        <Alert variant="error" title="Inscription impossible">
          {formError}
        </Alert>
      )}

      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field label="Adresse e-mail" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </Field>
        <PasswordField
          label="Mot de passe"
          hint="10 à 128 caractères."
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
        <Checkbox id="acceptTerms" {...register("acceptTerms")}>
          J&apos;accepte les <Link href="/cgv">CGV</Link> et la <Link href="/confidentialite">politique de confidentialité</Link>.
        </Checkbox>
        {errors.acceptTerms && <p className="-mt-2 text-[.8rem] text-error">{errors.acceptTerms.message}</p>}
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
          Créer mon compte
        </Button>
      </form>
    </AuthSplit>
  );
}
