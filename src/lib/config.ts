import { Redis } from "@upstash/redis";
/**
 * Runtime configuration and feature flags.
 *
 * Everything here reads lazily from `process.env` rather than at module load,
 * so `next build` never crashes on a missing variable. The site is designed to
 * render correctly with NOTHING configured — it simply refuses to take money.
 */

/** The currency every invoice is priced in. Donors are international. */
export const DONATION_CURRENCY = "USD";

export const VOULTI_API = "https://api.voulti.com";
export const VOULTI_CHECKOUT = "https://voulti.com/checkout";

/** How long a donor has to complete a payment before the link dies. */
export const INVOICE_TTL_MINUTES = 30;

export function commerceId(): string | null {
  return process.env.VOULTI_COMMERCE_ID?.trim() || null;
}

export function webhookSecret(): string | null {
  return process.env.VOULTI_WEBHOOK_SECRET?.trim() || null;
}

/**
 * Donations can only be taken when a commerce is configured. Until then the
 * UI shows an explicit "not live yet" state instead of a button that 500s.
 */
export function donationsEnabled(): boolean {
  return commerceId() !== null;
}

/**
 * Redis credentials, whatever the provider decided to call them.
 *
 * `Redis.fromEnv()` only reads UPSTASH_REDIS_REST_URL/TOKEN, but the Vercel
 * Marketplace integration injects the same credentials as KV_REST_API_URL and
 * KV_REST_API_TOKEN. Relying on `fromEnv` therefore left the counter silently
 * disconnected on a project that was correctly provisioned — the failure mode
 * being an empty ledger rather than an error.
 */
export function redisCreds(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() || process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || process.env.KV_REST_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

export function redisConfigured(): boolean {
  return redisCreds() !== null;
}

/**
 * Certificate issuance costs $0.10 USDC per credential, so it stays off until
 * BOTH the flag is on and a funded wallet key exists. A flag alone must never
 * be enough to start spending.
 */
export function certificatesEnabled(): boolean {
  return (
    process.env.HASHPROOF_ENABLED === "true" &&
    Boolean(process.env.HASHPROOF_WALLET_PRIVATE_KEY || process.env.HASHPROOF_API_KEY)
  );
}

/**
 * Where Voulti settles donations. This must be a normal wallet (EOA), not a
 * multi-signature contract: Voulti settles to one address across every network
 * the commerce enables, and a Safe deployed on one chain does not exist at the
 * same address on the others — funds paid on a chain where the contract is
 * absent can be stranded. The multi-sig is the sweep destination instead.
 */
export function intakeAddress(): string | null {
  return process.env.NEXT_PUBLIC_INTAKE_ADDRESS?.trim() || null;
}

/** The multi-signature treasury the intake wallet is swept into. */
export function treasuryAddress(): string | null {
  return process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.trim() || null;
}

export const SITE = {
  name: "DonaOnchain",
  domain: "donaonchain.com",
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://donaonchain.com",
  // donaonchain.com has no MX records, so hola@ there would silently bounce.
  // A contact address that never reaches anyone is worse than none at all.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "camilo@peewah.co",
} as const;

/** Block explorer per Voulti `paid_network` value. Values arrive lower-case. */
const EXPLORERS: Record<string, string> = {
  celo: "https://celoscan.io/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  polygon: "https://polygonscan.com/tx/",
  base: "https://basescan.org/tx/",
  bsc: "https://bscscan.com/tx/",
};

/**
 * A handful of early rows carry `Celo` capitalised, so normalise before
 * looking up — otherwise those donations render without a verifiable link.
 */
export function explorerUrl(network: string | null, txHash: string | null): string | null {
  if (!network || !txHash) return null;
  const base = EXPLORERS[network.toLowerCase()];
  return base ? `${base}${txHash}` : null;
}

export function networkLabel(network: string | null): string {
  if (!network) return "—";
  const labels: Record<string, string> = {
    celo: "Celo",
    arbitrum: "Arbitrum One",
    polygon: "Polygon",
    base: "Base",
    bsc: "BNB Chain",
  };
  return labels[network.toLowerCase()] ?? network;
}

/**
 * Builds an Upstash client from whichever credential names are present.
 *
 * Deliberately not `Redis.fromEnv()`: that helper only looks for
 * UPSTASH_REDIS_REST_*, and this project is provisioned through the Vercel
 * Marketplace, which injects KV_REST_API_* instead.
 */
export function createRedis(): Redis {
  const creds = redisCreds();
  if (!creds) throw new Error("Redis is not configured");
  return new Redis({ url: creds.url, token: creds.token });
}
