import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { donationsEnabled } from "@/lib/config";
import { createInvoice, VoultiError } from "@/lib/voulti";
import { saveDonation } from "@/lib/store";
import { rateLimit } from "@/lib/ratelimit";
import { MAX_DONOR_NAME } from "@/lib/limits";

/**
 * Creates a donation invoice and hands back a checkout URL.
 *
 * Runs server-side for two reasons: api.voulti.com sends no CORS headers to
 * third-party origins, and the amount has to be decided by code we control
 * rather than by whoever has the page open.
 */

const MAX_USD = 1_000_000;

export async function POST(req: Request) {
  if (!donationsEnabled()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Voulti rate-limits 100 req/min per IP — and every call leaves from our
  // server, so all visitors share one bucket. Throttling per visitor here
  // keeps one abusive client from starving everyone else's checkout.
  if (!(await rateLimit(`donate:${ip}`, 10, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: {
    amount?: unknown;
    name?: unknown;
    showName?: unknown;
    wantsCertificate?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_USD) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }
  // Voulti requires a positive JSON number; keep it to cents.
  const amountUsd = Math.round(amount * 100) / 100;
  if (amountUsd <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const donorName =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, MAX_DONOR_NAME)
      : null;
  // No email is collected. Nothing in this project sends one, and accepting a
  // personal detail we never use would only create data to leak.
  const donorEmail = null;

  // Must be exactly `true`, and meaningless without a name. Anything else —
  // absent, "true", 1 — reads as no consent, because publishing someone's
  // name is not a decision to infer from a loosely-typed field.
  const showName = body.showName === true && donorName !== null;

  // Same strictness, for the same reason: issuing a certificate spends money
  // and mints a credential in a person's name that can only ever be revoked,
  // never edited. A request has to say `true` outright, and it means nothing
  // without a name to put on the artwork.
  const wantsCertificate = body.wantsCertificate === true && donorName !== null;

  const reference = `don_${randomUUID()}`;

  try {
    const invoice = await createInvoice({
      amountUsd,
      // `reference` is ours alone and never shown to the donor.
      reference,
      // `description` is what the donor reads under the amount at checkout.
      description: "Donation — Colombia earthquake relief, Cali",
    });

    // Persist before redirecting. Voulti offers no way to list a commerce's
    // invoices, so an id we fail to store here is gone permanently — along
    // with the donor's name, email and any hope of reconciling the payment.
    await saveDonation({
      invoiceId: invoice.invoiceId,
      reference,
      amountUsd,
      donorName,
      showName,
      wantsCertificate,
      donorEmail,
      status: "Pending",
      createdAt: new Date().toISOString(),
      paidAt: null,
      txHash: null,
      network: null,
      token: null,
      paidAmount: null,
      certificateUrl: null,
    });

    return NextResponse.json({
      invoiceId: invoice.invoiceId,
      checkoutUrl: invoice.checkoutUrl,
    });
  } catch (err) {
    if (err instanceof VoultiError) {
      console.error("[donate] voulti error", err.httpStatus, err.message);
      return NextResponse.json({ error: "payment_provider" }, { status: 502 });
    }
    console.error("[donate] unexpected", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
