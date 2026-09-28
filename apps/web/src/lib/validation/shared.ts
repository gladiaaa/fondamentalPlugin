import { z } from "zod";

// Règles de docs/api-front.md §4 (« Règles utiles pour les formulaires »),
// partagées entre tous les formulaires qui prennent un e-mail ou un nouveau
// mot de passe (inscription, réinitialisation, changement de mot de passe).

export const emailRule = z.email("Adresse e-mail invalide.").max(254).trim().toLowerCase();

export const passwordRule = z
  .string()
  .min(10, "10 caractères minimum.")
  .max(128, "128 caractères maximum.");
