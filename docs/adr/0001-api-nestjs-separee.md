# 0001. Une API NestJS séparée du site

- État : acceptée
- Date : 2026-09-26

## Contexte

La boutique doit gérer des comptes, des paiements Stripe, des licences, des fichiers et des e-mails. Next.js sait servir des routes serveur, mais tout mettre dedans mélangerait l'affichage et la logique sensible, et un bot Discord ou une application mobile ne pourraient pas réutiliser ce code.

## Décision

Le site (`apps/web`, Next.js) ne fait qu'afficher. Toute la logique métier vit dans une **API NestJS** (`apps/api`), organisée en modules, dans le **même dépôt** (monorepo npm) avec des types partagés (`packages/shared`). Pas de microservices : un plugin de plus = une ligne dans `products`, pas un service.

## Conséquences

- Tous les secrets (Stripe, serveur de licences, base, e-mails) sont **uniquement dans l'API** ; le navigateur et le serveur Next.js n'en connaissent aucun.
- L'API a un contrat écrit (`apps/api/openapi.json`) que le site peut suivre sans lire le code.
- Deux images Docker à construire et déployer au lieu d'une ; `deploy.sh` les met en ligne ensemble, avec retour arrière automatique.
- Le site ne doit créer **aucune route sous `/api`** : nginx les envoie toutes à l'API ([0004](0004-api-sous-api.md)).
