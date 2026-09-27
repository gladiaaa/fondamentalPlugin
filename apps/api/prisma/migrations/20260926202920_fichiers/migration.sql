-- CreateEnum
CREATE TYPE "release_channel" AS ENUM ('RELEASE', 'BETA');

-- CreateEnum
CREATE TYPE "release_edition" AS ENUM ('UNIVERSAL', 'FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "release_platform" AS ENUM ('PAPER');

-- CreateTable
CREATE TABLE "minecraft_versions" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "minecraft_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "releases" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "channel" "release_channel" NOT NULL DEFAULT 'RELEASE',
    "changelog" TEXT NOT NULL DEFAULT '',
    "released_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_files" (
    "id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "edition" "release_edition" NOT NULL,
    "platform" "release_platform" NOT NULL DEFAULT 'PAPER',
    "file_name" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MinecraftVersionToReleaseFile" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_MinecraftVersionToReleaseFile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "minecraft_versions_version_key" ON "minecraft_versions"("version");

-- CreateIndex
CREATE UNIQUE INDEX "releases_product_id_version_key" ON "releases"("product_id", "version");

-- CreateIndex
CREATE INDEX "release_files_release_id_idx" ON "release_files"("release_id");

-- CreateIndex
CREATE UNIQUE INDEX "release_files_release_id_file_name_key" ON "release_files"("release_id", "file_name");

-- CreateIndex
CREATE INDEX "_MinecraftVersionToReleaseFile_B_index" ON "_MinecraftVersionToReleaseFile"("B");

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_files" ADD CONSTRAINT "release_files_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MinecraftVersionToReleaseFile" ADD CONSTRAINT "_MinecraftVersionToReleaseFile_A_fkey" FOREIGN KEY ("A") REFERENCES "minecraft_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MinecraftVersionToReleaseFile" ADD CONSTRAINT "_MinecraftVersionToReleaseFile_B_fkey" FOREIGN KEY ("B") REFERENCES "release_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Versions de Minecraft proposées : les 4 plugins ciblent Paper 1.21.x (1.21.4 et plus).
-- Une version de plus = une ligne de plus (migration ou, plus tard, publication d'une release).
INSERT INTO "minecraft_versions" ("id", "version", "sort_order")
VALUES
  (gen_random_uuid(), '1.21.4', 4),
  (gen_random_uuid(), '1.21.5', 5),
  (gen_random_uuid(), '1.21.6', 6),
  (gen_random_uuid(), '1.21.7', 7),
  (gen_random_uuid(), '1.21.8', 8),
  (gen_random_uuid(), '1.21.9', 9),
  (gen_random_uuid(), '1.21.10', 10),
  (gen_random_uuid(), '1.21.11', 11)
ON CONFLICT ("version") DO NOTHING;
