# 0004. L'API est servie sous `/api`, sur le même domaine que le site

- État : acceptée
- Date : 2026-09-26

## Contexte

Le site et l'API sont deux applications. Les mettre sur deux domaines (par exemple `api.fondamentalplugin.fr`) imposerait du CORS, des cookies « tiers » plus fragiles, un DNS et un certificat de plus.

## Décision

nginx envoie `/api/*` à l'API (conteneur `api`) et tout le reste au site. Même chose pour dev (`dev.fondamentalplugin.fr/api`). L'API a un préfixe global `/api`.

## Conséquences

- **Pas de CORS** : le navigateur appelle l'API sur son propre domaine, avec le cookie de session (`HttpOnly`, `SameSite=Lax`, préfixe `__Host-` en ligne).
- L'API n'accepte les requêtes qui modifient des données que si leur `Origin` est celle du site (défense anti-CSRF, avec le jeton `X-CSRF-Token`).
- Le site **ne doit créer aucune route sous `/api`**. Sa `/api/health` ne sert qu'au contrôle local de `deploy.sh`.
- En développement local, le site (`:3000`) et l'API (`:4000`) sont sur deux ports : le serveur de développement de Next.js doit relayer `/api/*` (rewrite).
- Les liens des e-mails pointent vers des **pages du site**, jamais vers l'API.
