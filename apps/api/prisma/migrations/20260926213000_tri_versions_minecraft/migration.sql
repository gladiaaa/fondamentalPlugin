-- Le rang d'une version de Minecraft devient calculable depuis son numéro (1.21.4 → 12104, 1.22 → 12200),
-- pour que la publication (#28) puisse en ajouter sans migration et qu'elles restent bien triées.
UPDATE "minecraft_versions"
SET "sort_order" =
  split_part("version", '.', 1)::int * 10000
  + split_part("version", '.', 2)::int * 100
  + COALESCE(NULLIF(split_part("version", '.', 3), ''), '0')::int;
