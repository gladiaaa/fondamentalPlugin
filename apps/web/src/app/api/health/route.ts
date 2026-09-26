import type { HealthResponse } from "@fondamental/shared";

// Point de contrôle utilisé après chaque déploiement.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ok: true,
    version: process.env.APP_VERSION ?? "local",
  } satisfies HealthResponse);
}
