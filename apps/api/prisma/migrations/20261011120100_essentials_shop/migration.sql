-- FondamentalShop (Free + Premium, licence `shop`) et FondamentalEssentials (entièrement gratuit).
-- Prix et prix Stripe de Shop : à régler dans /admin/produits. Shop existe déjà sur dev (ajouté à la
-- main) : on le met à jour au lieu d'échouer, sans toucher à son prix.
INSERT INTO "products" ("id", "slug", "name", "description", "license_product", "distribution", "requirements", "max_activations", "sort_order", "updated_at")
VALUES
  (
    gen_random_uuid(), 'shop', 'FondamentalShop',
    'Une boutique en menus pour votre serveur : objets, clés de caisses, grades LuckPerms, tags et commandes, avec revente (/sell, /sell all). Limites par joueur, délais, confirmation, commandes de boutique sur mesure. En Premium : boutique du jour, promotions, stock commun et monnaies au choix.',
    'shop', 'SINGLE_JAR',
    '{"platform":"Paper 1.21+ (Folia compatible)","java":21,"dependencies":[{"name":"Vault","required":true,"note":"Paiement des achats et des reventes, avec une économie (FondamentalEssentials, EssentialsX, CMI…)."},{"name":"LuckPerms","required":false,"note":"Vendre des grades et des permissions, définitifs ou temporaires."},{"name":"FondamentalCrate","required":false,"note":"Vendre des clés de caisses."},{"name":"FondamentalTag","required":false,"note":"Vendre des tags."},{"name":"PlaceholderAPI","required":false,"note":"Payer avec la monnaie de n''importe quel plugin (Premium)."},{"name":"ItemsAdder / Oraxen / Nexo","required":false,"note":"Vendre des objets personnalisés."}]}',
    5, 50, NOW()
  ),
  (
    gen_random_uuid(), 'essentials', 'FondamentalEssentials',
    'Les essentiels d''un serveur, entièrement gratuits : spawn, homes partagés, warps, téléportations, économie Vault avec journal, kits, coffres virtuels, courrier, format du chat, AFK et utilitaires. Chaque bloc se désactive, et tout se partage entre les serveurs d''un réseau en MySQL.',
    'essentials', 'FREE_ONLY',
    '{"platform":"Paper 1.21+ (Folia compatible)","java":21,"dependencies":[{"name":"Vault","required":false,"note":"Partager l''économie avec les autres plugins."},{"name":"LuckPerms","required":false,"note":"Préfixes de grade dans le chat."},{"name":"PlaceholderAPI","required":false,"note":"Placeholders dans le chat et les messages."},{"name":"FondamentalTag","required":false,"note":"Tags dans le chat."}]}',
    5, 60, NOW()
  )
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "license_product" = EXCLUDED."license_product",
  "distribution" = EXCLUDED."distribution",
  "requirements" = EXCLUDED."requirements",
  "updated_at" = NOW();
