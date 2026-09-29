# Parcours bout en bout (#34)

Playwright rejoue les parcours clés sur **dev.fondamentalplugin.fr** après chaque déploiement de dev
(workflow `.github/workflows/parcours.yml`, aussi lançable à la main). Le workflow échoue si un parcours
casse ; le rapport (captures, traces) est joint à l'exécution.

| Fichier | Parcours |
|---|---|
| `specs/catalogue.spec.ts` | accueil, catalogue des 4 plugins, fiche (prix, achat, fichiers), téléchargement vérifié par SHA-256, wiki |
| `specs/compte.spec.ts` | inscription (validation, adresse déjà inscrite), connexion, espace client, déconnexion, redirection d'un visiteur |
| `specs/achat.spec.ts` | achat avec la carte de test 4242 sur Stripe Checkout, clé affichée sur `/merci` et dans « Mes licences » |

Hors espaces de travail npm : ce dossier n'entre ni dans les images Docker ni dans le site.

## Compte de test

- Adresse `delivered@resend.dev` (variable `E2E_EMAIL` de l'environnement GitHub `dev`) : une boîte de test de Resend, qui accepte tout sans rien délivrer. Les e-mails des parcours (inscription, reçu) ne partent chez personne et n'abîment pas la réputation du domaine d'envoi.
- Mot de passe : secret `E2E_PASSWORD` de l'environnement `dev`. Le compte a été créé par `POST /api/auth/register`, puis confirmé directement en base de dev (on ne peut pas lire l'e-mail de confirmation).
- Chaque exécution crée une commande et une licence de test sur dev (instance de test du serveur de licences), jamais ailleurs.

## Garde-fous

- `playwright.config.ts` refuse de viser la prod ; le parcours d'achat s'arrête si la session Stripe n'est pas une session de test (`cs_test_`).
- La case « I am an AI agent… » de Stripe reste décochée : c'est un script de CI.

## En local

```bash
cd tests/parcours
npm ci && npx playwright install chromium
E2E_PASSWORD=… npx playwright test            # E2E_EMAIL vaut delivered@resend.dev par défaut
```
