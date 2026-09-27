// Types partagés entre le site et l'API : contrats des réponses JSON.
// Uniquement des types (import type) : l'API est compilée par tsc et ne peut pas
// exécuter le TypeScript de ce package.

/** Réponse de `GET /api/health`, vérifiée après chaque déploiement. */
export interface HealthResponse {
  ok: boolean;
  /** Version en ligne, de la forme `<branche>-<commit court>` (`local` en développement). */
  version: string;
}

/** Réponse de `GET /api/health` côté API : ajoute l'état de la base. */
export interface ApiHealthResponse extends HealthResponse {
  database: "up" | "down";
}

// ─── Comptes ────────────────────────────────────────────────────

/** Le compte tel que l'API le montre au navigateur. */
export interface AuthUser {
  id: string;
  email: string;
  /** Date ISO 8601. */
  createdAt: string;
}

/**
 * Réponse de `POST /api/auth/login` et `GET /api/auth/me`.
 * `csrfToken` doit être renvoyé dans l'en-tête `X-CSRF-Token` de chaque requête
 * qui modifie des données (POST, PUT, PATCH, DELETE) tant qu'on est connecté.
 */
export interface SessionResponse {
  user: AuthUser;
  csrfToken: string;
}

/** Réponse des routes qui n'indiquent volontairement rien de plus (inscription, mot de passe oublié…). */
export interface MessageResponse {
  message: string;
}

/** Corps d'erreur de l'API. `code` est présent pour les erreurs que le site doit distinguer. */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  code?:
    | "EMAIL_NOT_VERIFIED"
    | "PASSWORD_COMPROMISED"
    | "INVALID_LINK"
    | "CURRENT_PASSWORD_INVALID"
    | "NO_PASSWORD"
    | "SAME_PASSWORD"
    | "LICENSE_CLAIM_INVALID"
    | "LICENSE_SERVER_UNAVAILABLE";
}

/** Une session ouverte du compte, dans l'export de données (jamais son jeton). */
export interface AccountExportSession {
  createdAt: string;
  expiresAt: string;
  /** `true` pour la session qui a demandé l'export. */
  current: boolean;
}

/**
 * Toutes les données que la boutique détient sur un compte (`GET /api/me/export`).
 * Ne contient jamais de secret : ni mot de passe, ni empreinte, ni jeton. Les commandes, licences et
 * configurations s'ajouteront ici quand elles existeront.
 */
export interface AccountExport {
  /** Date ISO 8601. */
  exportedAt: string;
  account: {
    id: string;
    email: string;
    createdAt: string;
    emailVerifiedAt: string | null;
    /** `false` pour un compte qui n'utilise que la connexion par un service tiers. */
    hasPassword: boolean;
  };
  sessions: AccountExportSession[];
}

// ─── Catalogue ──────────────────────────────────────────────────

/** Un plugin dont dépend (ou que complète) un produit. */
export interface ProductDependency {
  name: string;
  /** `true` : le plugin ne démarre pas sans lui. */
  required: boolean;
  /** Pourquoi il est utile (texte affichable). */
  note: string;
}

/** Ce qu'il faut sur le serveur pour installer le plugin. */
export interface ProductRequirements {
  /** Ex. « Paper 1.21.4+ ». */
  platform: string;
  /** Version minimale de Java. */
  java: number;
  dependencies: ProductDependency[];
}

/**
 * `SINGLE_JAR` : un seul jar, la clé de licence décide de l'édition.
 * `FREE_PREMIUM_JARS` : deux jars, `free` et `premium`.
 */
export type ProductDistribution = "SINGLE_JAR" | "FREE_PREMIUM_JARS";

export interface ProductPrice {
  /** En centimes (1999 = 19,99). */
  amountCents: number;
  /** Code ISO 4217 en minuscules (`eur`). */
  currency: string;
}

/** Un plugin de la boutique, tel que le site l'affiche (`GET /api/products`). */
export interface ProductResponse {
  /** Identifiant dans les adresses du site (`bedwars`, `tag`, `crate`, `pass`). */
  slug: string;
  name: string;
  description: string;
  distribution: ProductDistribution;
  requirements: ProductRequirements;
  /** `null` tant que le prix n'est pas fixé. */
  price: ProductPrice | null;
  /** `false` : ne pas proposer l'achat (prix ou paiement pas encore configurés). */
  purchasable: boolean;
}

// ─── Fichiers ───────────────────────────────────────────────────

/**
 * `UNIVERSAL` : le jar unique (Bedwars, Pass), la clé de licence décide de l'édition.
 * `FREE` / `PREMIUM` : les deux jars de Tag et Crate (un jar Premium sans clé valide se comporte comme le Free).
 */
export type ReleaseEdition = "UNIVERSAL" | "FREE" | "PREMIUM";

export type ReleaseChannel = "RELEASE" | "BETA";

/** La version du plugin à laquelle appartient un fichier. */
export interface ReleaseInfo {
  /** Texte libre (`2.2.0`, `1.0-SNAPSHOT`) : ne pas la traiter comme un numéro. */
  version: string;
  channel: ReleaseChannel;
  /** Notes de version, en texte brut (peut être vide). */
  changelog: string;
  /** Date ISO 8601. */
  releasedAt: string;
}

/** Un jar téléchargeable (`GET /api/products/:slug/files`). */
export interface ReleaseFileResponse {
  id: string;
  edition: ReleaseEdition;
  platform: "PAPER";
  fileName: string;
  sizeBytes: number;
  /** Empreinte SHA-256 en hexadécimal, à afficher pour que le client vérifie son fichier. */
  sha256: string;
  /** Versions de Minecraft couvertes, de la plus récente à la plus ancienne. */
  minecraftVersions: string[];
  downloadCount: number;
  /** Adresse du téléchargement (`/api/downloads/:id`), publique. */
  downloadUrl: string;
  release: ReleaseInfo;
}

// ─── Licences ───────────────────────────────────────────────────

/** Une licence rattachée au compte (`GET /api/me/licenses`). Son statut détaillé viendra avec #25. */
export interface OwnedLicenseResponse {
  /** Clé de licence, propre au titulaire du compte : jamais affichée à quelqu'un d'autre. */
  key: string;
  /** Date ISO 8601 du rattachement (pas forcément celle de l'achat). */
  claimedAt: string;
}
