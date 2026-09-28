-- Back-office (#105) : blocage d'un compte, masquage d'une version publiée.
-- Colonnes facultatives : compatibles avec la version précédente de l'API.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "blocked_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "releases" ADD COLUMN     "hidden_at" TIMESTAMP(3);
