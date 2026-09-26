# 0002. Une base PostgreSQL dédiée, en Docker

- État : acceptée
- Date : 2026-09-26

## Contexte

Le VPS héberge déjà un MySQL, réservé aux serveurs Minecraft. La boutique stocke des comptes, des commandes et des licences : des données à isoler, sauvegarder et restaurer séparément.

## Décision

Chaque environnement (dev, prod) a **son propre conteneur PostgreSQL 17**, avec son volume (`fondamentalplugin-db-<env>`), joint uniquement par l'API et les migrations. Accès via **Prisma** (requêtes paramétrées, migrations versionnées).

## Conséquences

- La base n'a **aucun port publié** et vit sur un réseau Docker interne sans accès à Internet.
- Les migrations s'appliquent au déploiement (`prisma migrate deploy`) ; elles doivent rester compatibles avec la version précédente de l'API, car le retour arrière automatique ne les annule pas.
- Sauvegarde quotidienne par `pg_dump`, à restaurer avec `pg_restore` (voir le [runbook](../runbook.md)). Tant que les sauvegardes restent sur le VPS, une panne du serveur les emporte avec la base : la copie externe est suivie dans l'issue #41.
- Aucun SQL écrit à la main dans le code : pas d'injection SQL par construction.
