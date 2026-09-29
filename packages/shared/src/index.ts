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
  /** `ADMIN` : accès au back-office (#106), après la 2FA. */
  role: "CUSTOMER" | "ADMIN";
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
    | "LICENSE_SERVER_UNAVAILABLE"
    | "LICENSE_NOT_FOUND"
    | "PRODUCT_NOT_PURCHASABLE"
    | "PAYMENT_UNAVAILABLE"
    | "ORDER_NOT_FOUND"
    | "ORDER_NOT_PAID"
    | "TWO_FACTOR_REQUIRED"
    | "TOTP_INVALID_CODE"
    | "ACCOUNT_BLOCKED"
    | "CANNOT_MODIFY_SELF"
    | "USER_NOT_FOUND"
    | "RELEASE_NOT_FOUND"
    | "TWO_FACTOR_ALREADY_ENABLED"
    | "CONFIG_NOT_FOUND"
    | "CONFIG_NOT_BUYER"
    | "CONFIG_INVALID"
    | "CONFIG_LIMIT";
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

/** Une licence rattachée au compte (`GET /api/me/licenses`). Son statut détaillé : `GET /api/me/licenses/:id`. */
export interface OwnedLicenseResponse {
  /**
   * Identifiant interne, à mettre dans les URL (`/compte/licences/:id`, `/api/me/licenses/:id`) à la
   * place de la clé : une clé dans une URL finit dans l'historique, les journaux et l'en-tête Referer (#91).
   */
  id: string;
  /**
   * Plugin de la boutique correspondant à la clé ; `null` si inconnu (dans la liste : clé rattachée
   * avant que le plugin ne soit enregistré ; dans le détail : aucun produit ne correspond).
   */
  product: { slug: string; name: string } | null;
  /** Clé de licence, propre au titulaire du compte : jamais affichée à quelqu'un d'autre. */
  key: string;
  /** Date ISO 8601 du rattachement (pas forcément celle de l'achat). */
  claimedAt: string;
}

/**
 * Une installation (un serveur Minecraft) qui consomme une activation de la licence.
 * `installationId` : à repasser tel quel à `DELETE /api/me/licenses/:id/activations/:installationId`
 * pour la libérer.
 */
export interface LicenseActivation {
  installationId: string;
  /** Dates ISO 8601 de la première et de la dernière vérification de la licence par ce serveur. */
  firstSeenAt: string;
  lastSeenAt: string;
}

/** Statut détaillé d'une licence (`GET /api/me/licenses/:id`), #25. */
export interface LicenseDetailResponse extends OwnedLicenseResponse {
  edition: string;
  revoked: boolean;
  /** Date ISO 8601, ou `null` : licence sans limite de durée. */
  expiresAt: string | null;
  /** Nombre d'installations simultanées permises. */
  maxActivations: number;
  activations: LicenseActivation[];
}

// ─── Commandes ──────────────────────────────────────────────────

/**
 * `PENDING` : session Stripe créée, paiement pas encore confirmé.
 * `PAID` : webhook reçu, licence pas encore créée (ne devrait durer qu'un instant).
 * `LICENSED` : la clé existe, l'e-mail est parti.
 * `REFUNDED` : remboursée, la clé est révoquée sur le serveur de licences.
 */
export type OrderStatus = "PENDING" | "PAID" | "LICENSED" | "REFUNDED";

/** Réponse de `GET /api/orders/by-session/:id`, lue par la page /merci jusqu'à ce que la clé soit prête. */
export interface OrderResponse {
  status: OrderStatus;
  productSlug: string;
  /** Présente seulement quand `status` vaut `LICENSED`. */
  licenseKey: string | null;
}

/** Réponse de `POST /api/checkout` : l'adresse à laquelle rediriger le client (Stripe Checkout). */
export interface CheckoutResponse {
  url: string;
}

// ─── Back-office (admin, #32) ────────────────────────────────────

/** Réponse de `POST /api/admin/2fa/setup` : à afficher en QR code (`otpauthUrl`) ou en saisie manuelle (`secret`). */
export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
}

/** `GET /api/admin/2fa` : mise en place à faire (`enabled: false`) ou code à saisir pour cette session. */
export interface TwoFactorStatusResponse {
  enabled: boolean;
  verifiedForSession: boolean;
}

/** Une commande dans `GET /api/admin/orders`. */
export interface AdminOrderSummary {
  id: string;
  status: OrderStatus;
  productSlug: string;
  /** `null` : compte supprimé depuis la commande. */
  userEmail: string | null;
  amountCents: number;
  currency: string;
  createdAt: string;
}

/** `GET /api/admin/orders/:id` : le détail d'une commande. */
export interface AdminOrderDetail extends AdminOrderSummary {
  userId: string | null;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  licenseKey: string | null;
}

/** `GET /api/admin/licenses/:key` : vue admin, sans filtre par compte (contrairement à `/me/licenses/:id`). */
export interface AdminLicenseResponse {
  key: string;
  edition: string;
  revoked: boolean;
  expiresAt: string | null;
  maxActivations: number;
  activations: LicenseActivation[];
  /** Compte auquel la clé est rattachée dans notre base, s'il y en a un. */
  ownerUserId: string | null;
  claimedAt: string | null;
}

/** `POST /api/admin/licenses/:key/recreate` : la nouvelle clé qui remplace l'ancienne (révoquée). */
export interface RecreatedLicenseResponse {
  key: string;
}

/** `GET`/`PATCH /api/admin/products/:slug` : les champs modifiables depuis le back-office. */
export interface AdminProductResponse {
  slug: string;
  name: string;
  description: string;
  priceCents: number | null;
  currency: string;
  stripePriceId: string | null;
  active: boolean;
}

/** Un compte dans `GET /api/admin/users` (#105). */
export interface AdminUserSummary {
  id: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
  emailVerifiedAt: string | null;
  /** Non nul : compte bloqué (connexion refusée). */
  blockedAt: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  ordersCount: number;
  licensesCount: number;
}

/** Une licence rattachée au compte, dans `GET /api/admin/users/:id`. */
export interface AdminUserLicense {
  key: string;
  /** Plugin de la commande d'origine ; `null` pour une clé rattachée à la main (sans commande). */
  productSlug: string | null;
  orderId: string | null;
  claimedAt: string;
}

/** `GET`/`PATCH /api/admin/users/:id` : le compte, ses commandes et ses licences. */
export interface AdminUserDetail extends AdminUserSummary {
  orders: AdminOrderSummary[];
  licenses: AdminUserLicense[];
}

/** Un fichier d'une version, vu du back-office. */
export interface AdminReleaseFile {
  id: string;
  fileName: string;
  edition: "UNIVERSAL" | "FREE" | "PREMIUM";
  sizeBytes: number;
  sha256: string;
  downloadCount: number;
  minecraftVersions: string[];
}

/** Une version publiée dans `GET /api/admin/releases` et `PATCH /api/admin/releases/:id` (#105). */
export interface AdminReleaseResponse {
  id: string;
  productSlug: string;
  version: string;
  channel: "RELEASE" | "BETA";
  changelog: string;
  releasedAt: string;
  /** Non nul : masquée du site public (fichiers non téléchargeables). */
  hiddenAt: string | null;
  files: AdminReleaseFile[];
}

/** Une entrée du journal des actions admin (`GET /api/admin/actions`). */
export interface AdminActionEntry {
  id: string;
  adminEmail: string;
  /** `order.refund`, `license.revoke`, `user.block`, `release.update`… */
  action: string;
  targetType: string;
  targetId: string;
  metadata: unknown;
  createdAt: string;
}

/** `GET /api/admin/stats` : chiffres du tableau de bord (#105). Montants en centimes. */
export interface AdminStatsResponse {
  /** Commandes payées ou livrées (hors remboursées), par devise. */
  revenue: Array<{ currency: string; totalCents: number; last30DaysCents: number }>;
  orders: { licensed: number; paid: number; pending: number; refunded: number };
  /** Par plugin : ventes (hors remboursées) et téléchargements (toutes versions). */
  products: Array<{ slug: string; name: string; sales: number; revenueCents: number; downloads: number }>;
  /** Un point par jour sur les 30 derniers jours (UTC), du plus ancien au plus récent. */
  salesLast30Days: Array<{ date: string; sales: number; revenueCents: number }>;
  users: { total: number; verified: number; admins: number; blocked: number };
  recentActions: AdminActionEntry[];
}

// ─── Générateur de configuration (#30) ──────────────────────────

/**
 * Un champ du formulaire d'un fichier de configuration. `key` est la clé YAML, relative au champ
 * parent. Le formulaire du site et la validation de l'API lisent le même schéma.
 */
export type ConfigField =
  | ConfigTextField
  | ConfigNumberField
  | ConfigBooleanField
  | ConfigSelectField
  | ConfigTextListField
  | ConfigSectionField
  | ConfigMapField
  | ConfigListField
  | ConfigOneOfField
  | ConfigLicenseField;

interface ConfigFieldBase {
  key: string;
  label: string;
  /** Aide sous le champ. */
  help?: string;
  /** Fonction de l'édition Premium du plugin (information : le générateur est réservé aux acheteurs). */
  premium?: boolean;
  /** Intertitre sous lequel ranger le champ dans le formulaire (affichage seulement). */
  group?: string;
  /** N'afficher le champ que si le champ voisin `key` vaut `equals` (affichage seulement). */
  showIf?: { key: string; equals: string | number | boolean };
}

export interface ConfigTextField extends ConfigFieldBase {
  kind: "text";
  /** Texte MiniMessage (couleurs, dégradés) : aperçu possible côté site. */
  minimessage?: boolean;
  multiline?: boolean;
  placeholder?: string;
  /** Expression régulière que la valeur doit respecter (ex. un nom de matériau Minecraft). */
  pattern?: string;
  maxLength?: number;
  /** Valeur vide autorisée (défaut : oui). */
  optional?: boolean;
}

export interface ConfigNumberField extends ConfigFieldBase {
  kind: "number";
  integer?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface ConfigBooleanField extends ConfigFieldBase {
  kind: "boolean";
}

export interface ConfigSelectField extends ConfigFieldBase {
  kind: "select";
  options: Array<{ value: string; label: string; premium?: boolean }>;
}

/** Liste de textes (lignes de description, matériaux…). */
export interface ConfigTextListField extends ConfigFieldBase {
  kind: "textList";
  minimessage?: boolean;
  /** Expression régulière que chaque élément doit respecter. */
  pattern?: string;
  maxItems?: number;
}

/** Groupe de champs aux clés fixes (`license:`, `settings:`…). */
export interface ConfigSectionField extends ConfigFieldBase {
  kind: "section";
  fields: ConfigField[];
}

/** Entrées nommées par l'utilisateur (crates, tags, paliers, quêtes…), chacune avec les mêmes champs. */
export interface ConfigMapField extends ConfigFieldBase {
  kind: "map";
  /** Nom d'une entrée (« crate », « palier »…). */
  itemLabel: string;
  /** Expression régulière des noms d'entrée. */
  keyPattern: string;
  keyHelp?: string;
  maxItems?: number;
  /** Champs de chaque entrée (entrée = objet)… */
  fields?: ConfigField[];
  /** … ou valeur simple de chaque entrée (ex. `enchants: { SHARPNESS: 2 }`). */
  value?: ConfigField;
}

/**
 * Liste d'objets (récompenses, actions…). Avec `variants`, le champ `variants.key` (souvent `type`)
 * choisit les autres champs de l'élément.
 */
export interface ConfigListField extends ConfigFieldBase {
  kind: "list";
  itemLabel: string;
  maxItems?: number;
  fields?: ConfigField[];
  variants?: {
    key: string;
    options: Array<{ value: string; label: string; premium?: boolean; fields: ConfigField[] }>;
  };
}

/**
 * Valeur qui peut prendre plusieurs formes (ex. `amount: 3`, `amount: all` ou
 * `amount: {facile: 2, normal: 1}`) : la première forme valide est retenue. Les `key` des formes
 * sont ignorées (c'est celle de ce champ qui compte).
 */
export interface ConfigOneOfField extends ConfigFieldBase {
  kind: "oneOf";
  options: Array<{ label: string; field: ConfigField }>;
}

/** Clé de licence : toujours remplie par l'API avec la clé de l'acheteur, jamais saisie. */
export interface ConfigLicenseField extends ConfigFieldBase {
  kind: "license";
}

/** Valeurs d'un fichier, dans la forme du YAML (clés = `key` des champs). */
export type ConfigValue = string | number | boolean | null | string[] | ConfigValues | ConfigValues[];
export interface ConfigValues {
  [key: string]: ConfigValue;
}

/** Un fichier configurable d'une version d'un plugin (`GET /api/configs/:slug`). */
export interface ConfigFileSummary {
  file: string;
  label: string;
  description: string;
}

/** `GET /api/configs/:slug` : versions du plugin qui ont un générateur, la plus récente en premier. */
export interface ConfigPluginResponse {
  slug: string;
  versions: Array<{ version: string; files: ConfigFileSummary[] }>;
}

/** `GET /api/configs/:slug/:version/:file` : le schéma du formulaire et les valeurs livrées avec le plugin. */
export interface ConfigSchemaResponse extends ConfigFileSummary {
  slug: string;
  version: string;
  fields: ConfigField[];
  defaults: ConfigValues;
}

/** Une configuration enregistrée (`/api/me/configs`). */
export interface SavedConfigResponse {
  id: string;
  name: string;
  slug: string;
  version: string;
  file: string;
  values: ConfigValues;
  createdAt: string;
  updatedAt: string;
}

/** `POST /api/me/configs/render` : le fichier YAML prêt à déposer dans `plugins/<Plugin>/`. */
export interface RenderedConfigResponse {
  file: string;
  yaml: string;
}
