-- Suppression d'un compte qui a déjà acheté : les commandes (obligation comptable) et les licences
-- (révocation en cas de remboursement) restent, détachées du compte, au lieu de bloquer la suppression.

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";

-- DropForeignKey
ALTER TABLE "licenses" DROP CONSTRAINT "licenses_user_id_fkey";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "licenses" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
