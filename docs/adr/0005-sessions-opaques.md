# 0005. Sessions opaques en base plutôt que JWT

- État : acceptée
- Date : 2026-09-26

## Contexte

Il faut pouvoir **fermer une session à distance** (« se déconnecter partout », changement de mot de passe, suppression du compte). Un JWT signé reste valable jusqu'à son expiration, sauf à tenir une liste de révocation, ce qui revient à stocker les sessions.

## Décision

À la connexion, l'API tire un jeton aléatoire, le pose dans un cookie `HttpOnly` et ne garde en base que **son empreinte SHA-256**, avec la date d'expiration (30 jours, absolue) et un jeton anti-CSRF propre à la session. Chaque requête protégée relit la session en base.

## Conséquences

- Révocation immédiate : supprimer les lignes de `sessions` suffit.
- Une fuite de la base ne donne aucune session utilisable (seules des empreintes y figurent).
- Une lecture de base de plus par requête protégée : négligeable à cette échelle.
- Les sessions expirées sont ignorées à la lecture, et une tâche horaire de l'API (`CleanupService`) les supprime, avec les liens d'e-mail périmés.
