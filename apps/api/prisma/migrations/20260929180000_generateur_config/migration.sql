-- Générateur de configuration (#30) : plugin de chaque licence, configurations enregistrées.
-- Colonne facultative et nouvelle table : compatibles avec la version précédente de l'API.

-- AlterTable
ALTER TABLE "licenses" ADD COLUMN     "product_id" UUID;

-- Plugin des licences issues d'un achat (celles rattachées à la main sont complétées plus tard).
UPDATE "licenses" SET "product_id" = "orders"."product_id" FROM "orders" WHERE "licenses"."order_id" = "orders"."id";

-- CreateTable
CREATE TABLE "saved_configs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "product_slug" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_configs_user_id_idx" ON "saved_configs"("user_id");

-- CreateIndex
CREATE INDEX "licenses_product_id_idx" ON "licenses"("product_id");

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_configs" ADD CONSTRAINT "saved_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
