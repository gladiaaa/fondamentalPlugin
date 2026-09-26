-- CreateEnum
CREATE TYPE "product_distribution" AS ENUM ('SINGLE_JAR', 'FREE_PREMIUM_JARS');

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "license_product" TEXT NOT NULL,
    "distribution" "product_distribution" NOT NULL,
    "requirements" JSONB NOT NULL,
    "price_cents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "stripe_price_id" TEXT,
    "max_activations" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_license_product_key" ON "products"("license_product");

-- Données initiales : les 4 plugins (source : analyse des dépôts du 26/09/2026).
-- Les prix (price_cents) et les prix Stripe (stripe_price_id) restent vides : ils ne sont
-- pas décidés, et un produit sans prix n'est pas achetable. max_activations (5) est provisoire.
INSERT INTO "products" ("id", "slug", "name", "description", "license_product", "distribution", "requirements", "max_activations", "sort_order", "updated_at")
VALUES
  (
    gen_random_uuid(), 'bedwars', 'FondamentalBedwars',
    'Un Bedwars complet clé en main : matchmaking, classé Elo avec rangs, 82 cosmétiques, boutique et améliorations d''équipe, parties privées, mondes instanciés pour que les parties ne se gênent jamais.',
    'bedwars', 'SINGLE_JAR',
    '{"platform":"Paper 1.21.4","java":21,"dependencies":[{"name":"FastAsyncWorldEdit","required":true,"note":"Indispensable : chaque partie se joue dans un monde copié par FAWE."},{"name":"LuckPerms","required":false,"note":"Quasi indispensable : coins, cosmétiques, Elo et rangs y sont enregistrés."},{"name":"ProtocolLib","required":false,"note":"Skins des PNJ marchands."},{"name":"PlaceholderAPI","required":false,"note":"Statistiques dans le tableau des scores et le chat."}]}',
    5, 10, NOW()
  ),
  (
    gen_random_uuid(), 'tag', 'FondamentalTag',
    'Des tags de joueur animés dans le chat, au-dessus de la tête et dans la liste des joueurs. Boutique en jeu, raretés, événements saisonniers et Atelier où chaque joueur compose son propre tag.',
    'tagcustom', 'FREE_PREMIUM_JARS',
    '{"platform":"Paper 1.21.x","java":21,"dependencies":[{"name":"PlaceholderAPI","required":false,"note":"Pour afficher le tag dans les autres plugins (chat, scoreboard, TAB)."},{"name":"Vault","required":false,"note":"Payer les tags avec l''argent du serveur."},{"name":"PlayerPoints","required":false,"note":"Payer les tags avec des points."}]}',
    5, 20, NOW()
  ),
  (
    gen_random_uuid(), 'crate', 'FondamentalCrate',
    'Des crates animées et entièrement configurables : 9 animations dont une chambre au trésor en 3D, éditeur 100 % en jeu, pitié, limites de gain et paliers d''ouverture. Les probabilités affichées sont les vraies.',
    'crate', 'FREE_PREMIUM_JARS',
    '{"platform":"Paper 1.21+","java":21,"dependencies":[{"name":"Vault","required":false,"note":"Faire payer l''ouverture d''une crate."},{"name":"LuckPerms","required":false,"note":"Récompenses de permissions."},{"name":"PlaceholderAPI","required":false,"note":"Clés et statistiques dans les autres plugins."},{"name":"ItemsAdder / Oraxen / Nexo","required":false,"note":"Objets personnalisés en récompense."},{"name":"FondamentalTag","required":false,"note":"Tags en récompense."}]}',
    5, 30, NOW()
  ),
  (
    gen_random_uuid(), 'pass', 'FondamentalPass',
    'Un pass de saison et des quêtes partagés sur tout votre réseau : piste gratuite et piste premium, quêtes quotidiennes, hebdomadaires et de saison, 13 objectifs natifs et des objectifs sur mesure avec n''importe quel plugin.',
    'pass', 'SINGLE_JAR',
    '{"platform":"Paper 1.21.4+","java":21,"dependencies":[{"name":"PlaceholderAPI","required":false,"note":"Objectifs basés sur n''importe quel plugin et affichage de la progression."},{"name":"Vault","required":false,"note":"Récompenses en argent."},{"name":"LuckPerms","required":false,"note":"Vendre la piste premium avec une permission."},{"name":"FondamentalTag","required":false,"note":"Tags en récompense."},{"name":"FondamentalCrate","required":false,"note":"Clés de crate en récompense."}]}',
    5, 40, NOW()
  )
ON CONFLICT ("slug") DO NOTHING;
