import { NextResponse } from "next/server";
import { knownCommerce, webhookSecretFor } from "@/lib/config";
import { handleVoultiDelivery } from "@/lib/voulti-webhook";

/**
 * Per-commerce webhook endpoint.
 *
 * Voulti issues the signing secret per commerce and sends no `commerce_id` in
 * the delivery — the body is `invoice_id`, the amounts, the status and our own
 * `reference`, nothing that names the sender. A single endpoint holding a
 * single secret therefore cannot serve two commerces: it would verify one and
 * reject the other as a forgery. The path is the only place left to carry that
 * information, which is why each commerce gets its own URL:
 *
 *   /api/webhooks/voulti/peewah
 *   /api/webhooks/voulti/reficolombia
 *
 * Both write to the same store. That is safe because we persist every invoice
 * id at creation, so a settlement is matched by invoice — never by whichever
 * commerce happened to deliver it.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ commerce: string }> },
) {
  const { commerce } = await params;

  // An unrecognised slug is answered exactly like a missing secret: a 401 with
  // no detail. Distinguishing "no such commerce" from "wrong signature" would
  // let anyone probing the endpoint enumerate which merchants we serve.
  if (!knownCommerce(commerce)) {
    console.warn(`[voulti-webhook] delivery for unknown commerce "${commerce}"`);
    return NextResponse.json({ error: "not_configured" }, { status: 401 });
  }

  return handleVoultiDelivery(req, webhookSecretFor(commerce), commerce);
}
