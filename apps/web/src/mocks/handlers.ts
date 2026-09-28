import { http, HttpResponse } from "msw";

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

// Achat (#23, #24)
// Compte les appels par session pour simuler la vraie séquence que
// /merci interroge toutes les 2 s (docs/api-front.md §7) : payé, puis
// licence prête après quelques tours. Un id qui contient "retard" ne passe
// jamais à "licensed", pour tester l'état d'attente prolongée.
const orderPollCounts = new Map<string, number>();
const checkoutHandlers = [
  http.post("/api/checkout", () =>
    HttpResponse.json({ url: "https://checkout.stripe.com/test/mock-session" }),
  ),
  http.get("/api/orders/by-session/:sessionId", ({ params }) => {
    const sessionId = String(params.sessionId);
    const count = (orderPollCounts.get(sessionId) ?? 0) + 1;
    orderPollCounts.set(sessionId, count);

    const product = { slug: "bedwars", name: "FondamentalBedwars" };
    if (sessionId.includes("retard")) {
      return HttpResponse.json({ status: "paid", product, licenseKey: null });
    }
    if (count < 3) {
      return HttpResponse.json({ status: "paid", product, licenseKey: null });
    }
    return HttpResponse.json({ status: "licensed", product, licenseKey: "FBW-7K2Q-M9XD-4LTP" });
  }),
];

// Détail d'une licence et libération d'installation : toujours « prévues »
// (#25 complet). `GET /me/licenses` (liste) et `POST /me/licenses/claim`
// sont livrées depuis #65 (docs/api-front.md §4) : plus mockées ici, elles
// passent par la vraie API (lib/api/account.ts).
const licenseHandlers = [
  http.get("/api/me/licenses/:key", ({ params }) =>
    HttpResponse.json({
      key: params.key,
      product: { slug: "bedwars", name: "FondamentalBedwars" },
      status: "ACTIVE",
      purchasedAt: "2026-01-15T10:00:00.000Z",
      activationsUsed: 1,
      activationsMax: 3,
      activations: [
        {
          id: "act-demo-1",
          firstSeenAt: "2026-01-15T10:05:00.000Z",
          lastSeenAt: "2026-09-27T08:00:00.000Z",
        },
      ],
    }),
  ),
  http.delete("/api/me/licenses/:key/activations/:installationId", () =>
    new HttpResponse(null, { status: 204 }),
  ),
];

export const handlers = [...checkoutHandlers, ...licenseHandlers];
