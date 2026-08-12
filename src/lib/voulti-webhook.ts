import { after, NextResponse } from "next/server";
import { getInvoice, verifyWebhook, type VoultiWebhookEvent } from "@/lib/voulti";
import {
  alreadyHandled,
  claimCertificateAttempt,
  getDonation,
  markHandled,
  recordSettlement,
  saveDonation,
  type DonationRecord,
} from "@/lib/store";
import { issueDonationCertificate } from "@/lib/hashproof";
import { refreshStats } from "@/lib/stats";

/**
 * Voulti payment webhook.
 *
 * The shape of this handler is dictated by two hard constraints:
 *
 *  1. Voulti aborts the delivery after ~2s. The confirming `GET /invoices/:id`
 *     alone measures 1.2–1.8s, so doing it before replying would put an
 *     otherwise-correct handler into a permanent retry loop. Everything after
 *     the signature check therefore runs in `after()`.
 *  2. The signature must be verified BEFORE any short-circuit — including the
 *     `test` bail-out. An attacker can set `test: true` too, so a handler that
 *     returns 200 on it first would accept forged deliveries.
 *
 * Answering non-2xx costs one of only 8 retry attempts, after which the
 * invoice leaves the delivery queue for good. So we reserve 5xx for genuinely
 * transient problems and return 200 for anything a retry cannot fix.
 */

/**
 * Handles one delivery, given the secret of the commerce that sent it.
 *
 * `label` only ever reaches the logs — it is what tells you WHICH commerce a
 * rejected signature came from, which is the first thing you want to know when
 * two of them are configured.
 */
export async function handleVoultiDelivery(
  req: Request,
  secret: string | null,
  label: string,
): Promise<Response> {
  // Must be the RAW body: re-serialising the parsed JSON changes the bytes and
  // the HMAC will never match.
  const rawBody = await req.text();

  if (!secret) {
    // Absent secret is a misconfiguration, not "unsigned mode". Reject loudly
    // rather than silently trusting whatever arrives.
    console.error(`[voulti-webhook:${label}] no signing secret configured — rejecting`);
    return NextResponse.json({ error: "not_configured" }, { status: 401 });
  }

  if (!verifyWebhook(rawBody, req.headers.get("x-voulti-signature"), secret)) {
    console.warn(`[voulti-webhook:${label}] bad signature`);
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  after(async () => {
    try {
      const event = JSON.parse(rawBody) as VoultiWebhookEvent;

      // Rehearsal from the dashboard. Branch on presence, not value:
      // `test: false` is not a real payment either.
      if ("test" in event) return;

      // The webhook names the id `invoice_id`; the GET names it `id`.
      const invoiceId = event.invoice_id;
      if (!invoiceId) return;

      const key = event.status;
      if (await alreadyHandled(invoiceId, key)) return;

      await handleSettlement(invoiceId);

      // Recorded last, and only on success: marking it seen up front would
      // make every retry a discarded duplicate if the work above failed.
      await markHandled(invoiceId, key);
    } catch (err) {
      // Polling on the thank-you page is the backstop if this path fails.
      console.error(`[voulti-webhook:${label}] deferred work failed`, err);
    }
  });

  return NextResponse.json({ received: true });
}

/**
 * Re-reads the invoice from Voulti and updates our record.
 *
 * The webhook body is treated as untrusted beyond the invoice id: a forged
 * delivery must not be able to write a real-looking transaction hash onto an
 * unpaid donation. Every field below comes from the authenticated read.
 */
async function handleSettlement(invoiceId: string): Promise<void> {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) {
    console.error("[voulti-webhook] invoice not found", invoiceId);
    return;
  }

  const existing = await getDonation(invoiceId);
  if (!existing) {
    // We create every invoice ourselves, so this means storage was down at
    // creation time. Record what we can rather than dropping the donation.
    console.warn("[voulti-webhook] no local record for", invoiceId);
  }

  const record: DonationRecord = {
    invoiceId,
    reference: existing?.reference ?? invoiceId,
    amountUsd: invoice.amount_fiat,
    donorName: existing?.donorName ?? null,
    showName: existing?.showName ?? false,
    donorEmail: existing?.donorEmail ?? null,
    status: invoice.status,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    paidAt: invoice.paid_at,
    txHash: invoice.paid_tx_hash,
    network: invoice.paid_network,
    token: invoice.paid_token,
    paidAmount: invoice.paid_amount,
    certificateUrl: existing?.certificateUrl ?? null,
  };

  if (invoice.status !== "Paid") {
    // Expired and Refunded arrive here too. Neither means money: on both, the
    // merchant receives nothing. Record the outcome and stop.
    await saveDonation(record);
    return;
  }

  const isNew = await recordSettlement(record);
  if (!isNew) return; // Already counted — a replay must not move the totals.

  // The counter is the thing donors look at; refresh it immediately rather
  // than waiting for the revalidation window.
  refreshStats();

  // Certificate issuance costs real money and is best-effort by design. It
  // returns null instead of throwing, so it can never strand a settled
  // donation, and it runs only after the money is confirmed in.
  // Same claim the thank-you page takes. Whichever path gets here first
  // issues; the other finds the claim taken and leaves it alone, so one
  // donation can never mint two paid credentials.
  if (record.donorName && (await claimCertificateAttempt(invoiceId))) {
    const credential = await issueDonationCertificate({
      donorName: record.donorName,
      amountUsd: record.amountUsd,
      paidAt: record.paidAt,
    });
    if (credential) {
      await saveDonation({ ...record, certificateUrl: credential.verification_url });
      refreshStats();
    }
  }
}
