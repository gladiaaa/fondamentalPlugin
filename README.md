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

## Variables d'environnement

Voir [`.env.example`](.env.example). Aucun secret ne doit être commité : `.env.local` est ignoré par Git.

## Travailler sur le projet

Tout passe par des branches, des pull requests et des issues : voir [CONTRIBUTING.md](CONTRIBUTING.md).
