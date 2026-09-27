"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StateIcon } from "@/features/auth/StateIcon";
import { EnveloppeIcon } from "@/components/icons";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation/auth";
import { forgotPassword } from "@/lib/api/auth";

export default function MotDePasseOubliePage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordValues) {
    // Réponse volontairement identique que le compte existe ou non
    // (docs/api-front.md §4) : aucune gestion d'erreur à faire ici, on
    // affiche toujours l'écran « e-mail envoyé ».
    await forgotPassword(values.email).catch(() => {});
    setSent(true);
  }

  if (sent) {
    return (
      <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
        <div className="mx-auto grid max-w-[440px] gap-4 rounded-card-lg border border-line bg-surface p-8 text-center">
          <StateIcon variant="neutral">
            <EnveloppeIcon width={28} height={28} />
          </StateIcon>
          <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Vérifiez votre boîte mail</h1>
          <p className="text-muted">
            Si un compte existe pour cette adresse, vous recevrez un lien dans quelques minutes.
          </p>
          <Button asChild variant="secondary" fullWidth>
            <Link href="/connexion">Retour à la connexion</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-[clamp(28px,5vw,56px)] sm:px-8">
      <div className="mx-auto grid max-w-[440px] gap-5 rounded-card-lg border border-line bg-surface p-8">
        <div className="grid gap-1.5">
          <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Mot de passe oublié</h1>
          <p className="text-muted">
            Indiquez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.
          </p>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Adresse e-mail" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" placeholder="vous@exemple.fr" {...register("email")} />
          </Field>
          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            Envoyer le lien
          </Button>
        </form>
        <Link href="/connexion" className="text-center text-[.88rem] text-accent-text">
          Retour à la connexion
        </Link>
      </div>
    </section>
  );
}
