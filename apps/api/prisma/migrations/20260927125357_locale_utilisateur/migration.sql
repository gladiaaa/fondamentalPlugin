-- CreateEnum
CREATE TYPE "locale" AS ENUM ('FR', 'EN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "locale" "locale" NOT NULL DEFAULT 'FR';
