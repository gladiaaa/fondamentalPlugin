import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/** Pour les tests (Vitest, Testing Library) : `server.listen()` dans `beforeAll`. */
export const server = setupServer(...handlers);
