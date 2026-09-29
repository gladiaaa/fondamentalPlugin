import type { RequestHandler } from "msw";

/**
 * Mocks des routes « prévues » de docs/api-front.md §7 (pas encore livrées
 * par le back). Ne JAMAIS mocker une route déjà disponible (santé, auth,
 * catalogue, fichiers) : elle doit passer par la vraie API en développement,
 * sinon on ne détecte plus une régression réelle derrière un faux succès.
 *
 * Un handler disparaît le jour où la route qu'il simule est livrée — sans
 * toucher aux composants, qui ne connaissent que `lib/api/client.ts`.
 *
 * Configuration et OAuth (#30, #18) : pas encore de fixture ici, faute de
 * contrat assez stable à simuler ; à ajouter avec l'issue correspondante.
 */

// Achat (`POST /checkout`, `GET /orders/by-session/:id`) : livré par #84/#88,
// plus simulé ici (#99). En local, tester avec les clés Stripe de test et
// `stripe listen --forward-to localhost:4000/api/stripe/webhook`.

// Licences (liste, détail, libération, rattachement) : livrées (#25, #45, #91),
// plus simulées ici.

export const handlers: RequestHandler[] = [];
