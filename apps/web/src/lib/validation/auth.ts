import { z } from "zod";

// Règles de docs/api-front.md §4 (« Règles utiles pour les formulaires ») :
// e-mail 254 caractères max, mot de passe 10 à 128. L'API met déjà l'e-mail
// en minuscules et retire les espaces ; on le fait aussi ici pour que le
// champ affiche la valeur telle qu'elle sera envoyée.
const email = z.email("Adresse e-mail invalide.").max(254).trim().toLowerCase();

// À la connexion, aucune règle de mot de passe n'est révélée (§4) : juste
// « requis ». Aux autres formulaires, la vraie contrainte de l'API.
const password = z
  .string()
  .min(10, "10 caractères minimum.")
  .max(128, "128 caractères maximum.");

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
