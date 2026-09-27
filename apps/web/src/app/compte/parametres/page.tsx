"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordField } from "@/components/ui/PasswordField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useSession } from "@/lib/session/SessionContext";
import { changePassword, logoutAll, downloadAccountExport, deleteAccount } from "@/lib/api/account";
import { changePasswordSchema, deleteAccountSchema, type ChangePasswordValues, type DeleteAccountValues } from "@/lib/validation/account";
import { ApiRequestError } from "@/lib/api/client";

export default function ParametresPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <p className="font-mono text-[.7rem] uppercase tracking-[.1em] text-muted">Espace client</p>
        <h1 className="font-display text-[1.4rem] font-semibold tracking-[-.03em]">Paramètres</h1>
      </div>
      <ChangePasswordSection />
      <SessionsSection />
      <DataSection />
      <DeleteAccountSection />
    </div>
  );
}

function ChangePasswordSection() {
  const { csrfToken } = useSession();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordValues) {
    if (!csrfToken) return;
    setFormError(null);
    setSuccess(false);
    try {
      await changePassword(values.currentPassword, values.newPassword, csrfToken);
      setSuccess(true);
      reset();
    } catch (error) {
      setFormError(error instanceof ApiRequestError ? error.message : "Une erreur inattendue s'est produite.");
    }
  }

  return (
    <section className="grid gap-4 rounded-card-lg border border-line bg-surface p-5">
      <h2 className="font-display text-[1.05rem] font-semibold">Mot de passe</h2>
      {success && (
        <Alert variant="success" title="Mot de passe modifié">
          Vos autres sessions ont été fermées.
        </Alert>
      )}
      {formError && (
        <Alert variant="error" title="Échec">
          {formError}
        </Alert>
      )}
      <form className="grid max-w-[420px] gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <PasswordField
          label="Mot de passe actuel"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <PasswordField
          label="Nouveau mot de passe"
          hint="10 à 128 caractères."
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <PasswordField
          label="Confirmer le nouveau mot de passe"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" loading={isSubmitting} className="justify-self-start">
          Changer le mot de passe
        </Button>
      </form>
    </section>
  );
}

function SessionsSection() {
  const { csrfToken, logout } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogoutAll() {
    if (!csrfToken) return;
    setLoading(true);
    try {
      await logoutAll(csrfToken);
      // Ferme aussi la session courante côté API : on efface l'état local et
      // on renvoie vers l'accueil plutôt que de laisser une page protégée
      // affichée avec une session qui n'existe plus.
      await logout();
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-card-lg border border-line bg-surface p-5">
      <h2 className="font-display text-[1.05rem] font-semibold">Sessions</h2>
      <p className="text-[.9rem] text-muted">
        Se déconnecte de tous les appareils connectés à ce compte, y compris celui-ci.
      </p>
      <Button variant="secondary" loading={loading} onClick={handleLogoutAll} className="justify-self-start">
        Se déconnecter partout
      </Button>
    </section>
  );
}

function DataSection() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(false);

  async function handleExport() {
    setDownloading(true);
    setError(false);
    try {
      await downloadAccountExport();
    } catch {
      setError(true);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-card-lg border border-line bg-surface p-5">
      <h2 className="font-display text-[1.05rem] font-semibold">Vos données</h2>
      <p className="text-[.9rem] text-muted">
        Téléchargez tout ce que nous détenons sur votre compte. Ne contient jamais de mot de passe ni de jeton.
      </p>
      {error && (
        <Alert variant="error" title="Téléchargement impossible">
          Réessayez dans un instant.
        </Alert>
      )}
      <Button variant="secondary" loading={downloading} onClick={handleExport} className="justify-self-start">
        Télécharger mes données
      </Button>
    </section>
  );
}

function DeleteAccountSection() {
  const { csrfToken } = useSession();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeleteAccountValues>({ resolver: zodResolver(deleteAccountSchema) });

  async function onSubmit(values: DeleteAccountValues) {
    if (!csrfToken) return;
    setFormError(null);
    try {
      await deleteAccount(values.password, csrfToken);
      router.push("/");
    } catch (error) {
      setFormError(error instanceof ApiRequestError ? error.message : "Une erreur inattendue s'est produite.");
    }
  }

  return (
    <section className="grid gap-3 rounded-card-lg border border-error/40 bg-surface p-5">
      <h2 className="font-display text-[1.05rem] font-semibold text-error">Supprimer le compte</h2>
      <p className="text-[.9rem] text-muted">
        Définitif : vos licences ne fonctionneront plus, cette action ne peut pas être annulée.
      </p>
      {!confirming ? (
        <Button variant="danger" onClick={() => setConfirming(true)} className="justify-self-start">
          Supprimer mon compte
        </Button>
      ) : (
        <form className="grid max-w-[360px] gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
          {formError && (
            <Alert variant="error" title="Échec">
              {formError}
            </Alert>
          )}
          <PasswordField
            label="Confirmez avec votre mot de passe"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex gap-2.5">
            <Button type="submit" variant="danger" loading={isSubmitting}>
              Confirmer la suppression
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
