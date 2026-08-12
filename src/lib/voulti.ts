import { createHmac, timingSafeEqual } from "crypto";
import {
  DONATION_CURRENCY,
  INVOICE_TTL_MINUTES,
  VOULTI_API,
  VOULTI_CHECKOUT,
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

async function readError(res: Response): Promise<string> {
  // Failures do not use the { success, data } envelope — they are { error }.
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Voulti returned ${res.status}`;
  } catch {
    return `Voulti returned ${res.status}`;
  }
}

export async function createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
  const id = commerceId();
  if (!id) {
    throw new VoultiError("VOULTI_COMMERCE_ID is not configured", 503);
  }

  const expiresAt = new Date(Date.now() + INVOICE_TTL_MINUTES * 60_000).toISOString();

  const res = await fetch(`${VOULTI_API}/invoices`, {
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
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new VoultiError(await readError(res), res.status);
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
  if (!res.ok) throw new VoultiError(await readError(res), res.status);

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
