# `features/checkout`

Achat : `/merci` (interrogation toutes les 2 s de l'état de commande), `/paiement-annule`. Routes prévues (#23, #24), simulées par `src/mocks/handlers.ts`. Le site ne déclenche jamais la licence : c'est le webhook Stripe côté serveur qui le fait.
