# Décisions d'architecture (ADR)

Une page courte par décision importante : le contexte, ce qui a été choisi, ce que ça coûte. On n'en réécrit pas une ancienne : si une décision change, on ajoute une nouvelle page qui la remplace et on passe l'ancienne en « remplacée ».

| N° | Décision | État |
|---|---|---|
| [0001](0001-api-nestjs-separee.md) | Une API NestJS séparée du site | acceptée |
| [0002](0002-postgresql-dedie.md) | Une base PostgreSQL dédiée, en Docker | acceptée |
| [0003](0003-jar-unique-free-premium.md) | Un jar unique pour Free et Premium quand c'est possible | acceptée |
| [0004](0004-api-sous-api.md) | L'API est servie sous `/api`, sur le même domaine que le site | acceptée |
| [0005](0005-sessions-opaques.md) | Sessions opaques en base plutôt que JWT | acceptée |

## Ajouter une décision

Copier le modèle ci-dessous dans `docs/adr/NNNN-sujet.md`, remplir, ajouter une ligne au tableau.

```markdown
# NNNN. Titre

- État : proposée | acceptée | remplacée par NNNN
- Date : AAAA-MM-JJ

## Contexte
Le problème, les contraintes.

## Décision
Ce qui est choisi, en une ou deux phrases.

## Conséquences
Ce que ça apporte, ce que ça coûte, ce qu'il faudra surveiller.
```
