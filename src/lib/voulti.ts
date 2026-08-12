import { createHmac, timingSafeEqual } from "crypto";
import {
  DONATION_CURRENCY,
  INVOICE_TTL_MINUTES,
  VOULTI_API,
  VOULTI_CHECKOUT,
  SITE,
  commerceId,
} from "./config";
import type { DonationStatus } from "./store";

/**
 * Voulti client.
 *
 * Two things about this API bite if you assume consistency, and both are
 * handled explicitly below:
 *
 *  1. The response envelope differs by endpoint. `POST /invoices` wraps the
 *     invoice in `{ success, data }`; `GET /invoices/:id` returns it bare at
 *     the top level. Reading `data.id` from the GET yields undefined.
 *  2. The webhook calls the invoice id `invoice_id`, while the GET calls it
 *     `id`.
 *
 * Every call is server-side only: api.voulti.com sends no CORS headers for
 * third-party origins, and the amount must be decided by our code rather than
 * by whoever has the page open.
 */

export type CreateInvoiceInput = {
  amountUsd: number;
  /** Our own id, for reconciliation. Never shown to the donor. */
  reference: string;
  /** Shown to the donor on the checkout, under the amount. */
  description: string;
};

export type CreatedInvoice = {
  invoiceId: string;
  checkoutUrl: string;
  expiresAt: string | null;
};

/** The bare object returned by `GET /invoices/:id`. */
export type VoultiInvoice = {
  id: string;
  amount_fiat: number;
  fiat_currency: string;
  status: DonationStatus;
  paid_at: string | null;
  paid_tx_hash: string | null;
  paid_token: string | null;
  paid_network: string | null;
  paid_amount: number | null;
  description?: string | null;
};

export class VoultiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "VoultiError";
  }
}

async function readError(res: Response): Promise<{ message: string; code?: string }> {
  // Failures do not use the { success, data } envelope — they are { error },
  // plus a machine-readable `code` on the return_url rejections.
  try {
    const body = (await res.json()) as { error?: string; code?: string };
    return { message: body.error ?? `Voulti returned ${res.status}`, code: body.code };
  } catch {
    return { message: `Voulti returned ${res.status}` };
  }
}

/**
 * Where the payer is sent once the invoice reaches a final status.
 *
 * `{invoice_id}` is substituted by Voulti. Without it the payer arrives with no
 * way to tell which invoice they just paid — and any state we kept in their
 * session is gone if they started on desktop and finished on their phone.
 *
 * The host must be on the commerce's own allowlist (Receive Payments →
 * Developers → Return domains) or every invoice is rejected. That check exists
 * because creating invoices needs no credentials and the commerce_id is public,
 * so without it anyone could point a merchant's payers at a site of their
 * choosing.
 */
function returnUrl(): string {
  return `${SITE.url.replace(/\/$/, "")}/thanks?invoice={invoice_id}`;
}

/** Rejections that mean "the allowlist is not set up", not "bad request". */
const RETURN_URL_CODES = ["return_url:no-allowlist", "return_url:host-not-allowed"];

export async function createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
  const id = commerceId();
  if (!id) {
    throw new VoultiError("VOULTI_COMMERCE_ID is not configured", 503);
  }

  const expiresAt = new Date(Date.now() + INVOICE_TTL_MINUTES * 60_000).toISOString();

  const post = (withReturnUrl: boolean) =>
    fetch(`${VOULTI_API}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commerce_id: id,
        amount_fiat: input.amountUsd,
        // Required, and chosen per invoice — there is no account-level default.
        currency: DONATION_CURRENCY,
        reference: input.reference.slice(0, 200),
        description: input.description.slice(0, 300),
        expires_at: expiresAt,
        ...(withReturnUrl ? { return_url: returnUrl() } : {}),
      }),
      cache: "no-store",
    });

  let res = await post(true);

  if (!res.ok) {
    const err = await readError(res);
    // The allowlist is edited by the merchant in their dashboard, so this app
    // cannot fix it and must not break because of it. Retrying without the
    // field keeps donations flowing on a live site; the redirect simply starts
    // working the moment the domain is authorised, with nothing to redeploy.
    if (err.code && RETURN_URL_CODES.includes(err.code)) {
      console.warn(
        `[voulti] return_url rejected (${err.code}) — add ${new URL(SITE.url).hostname} under Receive Payments → Developers → Return domains. Falling back to no redirect.`,
      );
      res = await post(false);
      if (!res.ok) {
        const retryErr = await readError(res);
        throw new VoultiError(retryErr.message, res.status);
      }
    } else {
      throw new VoultiError(err.message, res.status);
    }
  }

  // POST wraps the invoice — the id lives at data.id, not id.
  const body = (await res.json()) as {
    success: boolean;
    data: { id: string; expires_at?: string | null };
  };

  return {
    invoiceId: body.data.id,
    checkoutUrl: `${VOULTI_CHECKOUT}/${body.data.id}`,
    expiresAt: body.data.expires_at ?? expiresAt,
  };
}

export async function getInvoice(invoiceId: string): Promise<VoultiInvoice | null> {
  const res = await fetch(`${VOULTI_API}/invoices/${invoiceId}`, { cache: "no-store" });

  if (res.status === 404) return null;
  if (!res.ok) throw new VoultiError((await readError(res)).message, res.status);

  // GET returns the invoice bare — there is no `data` field to unwrap.
  return (await res.json()) as VoultiInvoice;
}

/**
 * Verify `X-Voulti-Signature: t=<unix>,v1=<hex>` against the raw request body.
 *
 * Must be given the RAW body: re-serialising the parsed JSON changes the bytes
 * and the HMAC will never match.
 *
 * An absent header is treated as invalid rather than as "unsigned mode" — a
 * handler that accepts unsigned deliveries lets anyone who learns the URL fake
 * a donation.
 */
export function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.trim().split(/=(.*)/s).slice(0, 2)),
  ) as { t?: string; v1?: string };

  if (!parts.t || !parts.v1) return false;

  // Replay guard: a genuine delivery captured once must not be reusable forever.
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parts.v1, "utf8");
  if (a.length !== b.length) return false; // timingSafeEqual throws on length mismatch
  return timingSafeEqual(a, b);
}

/** The bare JSON body Voulti POSTs to the confirmation URL. */
export type VoultiWebhookEvent = {
  invoice_id: string;
  amount_fiat: number;
  fiat_currency: string;
  status: DonationStatus;
  reference?: string | null;
  /** Present only on rehearsals fired from the dashboard. Branch on presence. */
  test?: boolean;
};
