import { webhookSecret } from "@/lib/config";
import { handleVoultiDelivery } from "@/lib/voulti-webhook";

/**
 * Single-commerce webhook endpoint.
 *
 * Kept because it is the URL already registered in a live Voulti dashboard —
 * removing it would silently stop settlements for whichever commerce still
 * points here. New commerces should use `/api/webhooks/voulti/<commerce>`,
 * which selects the signing secret from the path; see that route for why the
 * path has to carry it.
 */
export async function POST(req: Request) {
  return handleVoultiDelivery(req, webhookSecret(), "default");
}
