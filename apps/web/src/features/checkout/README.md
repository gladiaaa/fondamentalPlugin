# `features/checkout`

Achat : bouton « Acheter la licence » (`BuyButton`, `POST /checkout` puis redirection vers Stripe Checkout), `/merci` (interrogation toutes les 2 s de `GET /orders/by-session/:id` jusqu'à `LICENSED`), `/paiement-annule`. Routes livrées (#23, #24), plus simulées par MSW. Le site ne déclenche jamais la licence : c'est le webhook Stripe côté serveur qui le fait.
