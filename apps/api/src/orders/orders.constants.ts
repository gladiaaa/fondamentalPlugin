const MINUTE = 60_000;

export const THROTTLE = {
  /** Un achat n'est jamais urgent : limite large pour absorber un double clic, pas pour du débit. */
  checkout: { limit: 10, ttl: MINUTE },
} as const;

export const MESSAGES = {
  paymentUnavailable: 'Paiement momentanément indisponible.',
  productNotPurchasable: "Ce produit n'est pas disponible à l'achat.",
  orderNotFound: 'Commande introuvable.',
  orderNotPaid: "Cette commande n'a pas encore été payée.",
} as const;
