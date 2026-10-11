-- Plugin entièrement gratuit (FondamentalEssentials) : ni licence ni achat.
-- Migration séparée : PostgreSQL refuse d'utiliser une valeur d'enum dans la transaction qui l'ajoute.
ALTER TYPE "product_distribution" ADD VALUE 'FREE_ONLY';
