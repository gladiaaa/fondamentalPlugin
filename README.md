# Fondamental Plugin : boutique

Site de vente des plugins Minecraft **Fondamental** : FondamentalBedwars, FondamentalTag et FondamentalCrate.

Pour le client : il choisit un plugin, paie avec Stripe, puis reçoit immédiatement sa **clé de licence Premium**, à l'écran et par e-mail. Il colle cette clé dans le `config.yml` du plugin, et le plugin passe en Premium.

## Stack

| Rôle | Outil |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + TypeScript |
| Style | Tailwind CSS 4 |
| Paiement | [Stripe Checkout](https://stripe.com/docs/payments/checkout) |
| Licences | `license-server` Fondamental (API admin, clés signées Ed25519) |
| E-mails | [Resend](https://resend.com) (optionnel) |

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
```

Paiements en local : utiliser les **clés de test** Stripe et relayer les webhooks avec la [CLI Stripe](https://stripe.com/docs/stripe-cli) :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (vérifie aussi les types) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Vérification des types |

## Variables d'environnement

Voir [`.env.example`](.env.example). Aucun secret ne doit être commité : `.env.local` est ignoré par Git.

## Environnements

| Environnement | Branche | Adresse |
|---|---|---|
| Développement | `dev` (par défaut) | https://dev.fondamentalplugin.fr |
| Production | `prod` | https://fondamentalplugin.fr |

Chaque push sur `dev` ou `prod` construit l'image Docker et la déploie automatiquement, avec retour à la version précédente si le site ne répond pas : voir [deploy/README.md](deploy/README.md).

```bash
docker build -t fondamentalplugin .
docker run --rm -p 3000:3000 fondamentalplugin   # http://localhost:3000
```

## Travailler sur le projet

Tout passe par des issues, des branches et des pull requests vers `dev` ; `prod` ne reçoit que des PR depuis `dev`. Voir [CONTRIBUTING.md](CONTRIBUTING.md).
