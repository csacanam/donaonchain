import { NextResponse } from "next/server";
import { getInvoice } from "@/lib/voulti";
import {
  claimCertificateAttempt,
  getDonation,
  recordSettlement,
  saveDonation,
  type DonationRecord,
} from "@/lib/store";
import { issueDonationCertificate } from "@/lib/hashproof";
import { rateLimit } from "@/lib/ratelimit";
import { certificatesEnabled, explorerUrl, networkLabel } from "@/lib/config";
import { refreshStats } from "@/lib/stats";

/**
 * Payment status for the thank-you page.
 *
 * This is not only a read. It doubles as the settlement backstop: the webhook
 * is batched (it lands seconds after settlement, and only if the merchant has
 * configured a confirmation URL at all), so a donation would otherwise never
 * reach the counter on a fresh deployment. Whichever path sees the payment
 * first records it; `recordSettlement` is idempotent, so both running is safe.
 */

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Generous: the page polls every few seconds while a donor waits at checkout.
  if (!(await rateLimit(`invoice:${ip}`, 60, 60))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let invoice;
  try {
    invoice = await getInvoice(id);
  } catch (err) {
    console.error("[invoice] lookup failed", err);
    return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
  }

  if (!invoice) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existing = await getDonation(id);

  const record: DonationRecord = {
    invoiceId: id,
    reference: existing?.reference ?? id,
    amountUsd: invoice.amount_fiat,
    donorName: existing?.donorName ?? null,
    showName: existing?.showName ?? false,
    // `=== true`, not `?? false`: a record written before this field existed
    // carries no answer, and no answer must not buy anybody a credential.
    wantsCertificate: existing?.wantsCertificate === true,
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

  let certificateUrl = record.certificateUrl;

  // A donor who ASKED for a certificate is owed one; whether this request or
  // the webhook happened to be the one that recorded the settlement is an
  // implementation detail they should never pay for.
  //
  // The request is what makes it owed, not the name. This used to test the
  // name alone, so a donor who picked "no, thanks" got one anyway — and the
  // thank-you page then sat polling for a certificate they had declined.
  const owedCertificate =
    invoice.status === "Paid" &&
    certificatesEnabled() &&
    record.wantsCertificate &&
    Boolean(record.donorName) &&
    !certificateUrl;

  if (invoice.status === "Paid") {
    if (await recordSettlement(record)) refreshStats();

    // Deliberately NOT gated on having been the path that recorded the
    // settlement. It used to be, and that lost certificates outright: the
    // webhook records first, this request then sees `isNew === false`, skips
    // issuance, and the webhook's own attempt is the only one that ever runs.
    // If it fails, nothing retries, and the donation keeps a name with no
    // credential for good.
    if (owedCertificate && (await claimCertificateAttempt(id))) {
      const credential = await issueDonationCertificate({
        donorName: record.donorName!,
        amountUsd: record.amountUsd,
        paidAt: record.paidAt,
      });
      if (credential) {
        certificateUrl = credential.verification_url;
        await saveDonation({ ...record, certificateUrl });
        refreshStats();
      }
    }
  } else if (existing && existing.status !== invoice.status) {
    // An invoice seen as Expired can still flip to Refunded for up to 24h
    // after expiry, when late funds arrive and are sent back. Keep the local
    // record following the real status rather than freezing on the first one.
    await saveDonation(record);
  }

  return NextResponse.json({
    status: invoice.status,
    amountUsd: invoice.amount_fiat,
    // `paid_amount` is the crypto actually transferred, recorded at
    // settlement — unlike `amount_usd`, which Voulti recomputes at today's
    // rate on every read and which therefore never matches what settled.
    paidAmount: invoice.paid_amount,
    token: invoice.paid_token,
    network: invoice.paid_network,
    networkLabel: networkLabel(invoice.paid_network),
    txUrl: explorerUrl(invoice.paid_network, invoice.paid_tx_hash),
    certificateUrl,
    // Lets the page keep waiting instead of settling on "no certificate".
    // Issuance can finish a second or two after the payment does, and the
    // page used to stop polling the moment the status read Paid.
    certificatePending: owedCertificate && !certificateUrl,
  });
}
