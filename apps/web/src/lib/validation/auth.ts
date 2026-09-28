import { z } from "zod";
import { emailRule as email, passwordRule as password } from "./shared";

// À la connexion, aucune règle de mot de passe n'est révélée (docs/api-front.md
// §4) : juste « requis ». Aux autres formulaires, la vraie contrainte de l'API
// (voir lib/validation/shared.ts).

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Mot de passe requis."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: "Acceptez les CGV pour continuer." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
