import { z } from "zod";
import { passwordRule } from "./shared";

export const claimLicenseSchema = z.object({
  key: z.string().trim().min(1, "Clé requise."),
});
export type ClaimLicenseValues = z.infer<typeof claimLicenseSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis."),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Mot de passe requis."),
});
export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;
