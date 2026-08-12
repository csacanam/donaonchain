import { certificatesEnabled } from "./config";
import { MAX_DONOR_NAME } from "./limits";

/**
 * Donation certificates via HashProof.
 *
 * Each credential is registered on Celo, pinned to IPFS, and gets a public
 * verification URL plus a PDF with a QR code. Issuance costs $0.10 USDC and is
 * paid straight out of a dedicated wallet over x402 — so this module is
 * deliberately hard to trigger by accident:
 *
 *  - `certificatesEnabled()` requires both an explicit flag and a key.
 *  - A failure here never fails the donation. The money has already settled;
 *    a missing certificate is an inconvenience we can fix later, whereas a
 *    thrown error inside the webhook handler would strand the whole record.
 *
 * A credential can be revoked afterwards, never edited — so nothing is issued
 * until the payment is confirmed settled.
 */

const ISSUE_URL = "https://api.hashproof.dev/issueCredential";

/**
 * Which chain the issuance fee is paid from. The wallet must hold USDC there.
 * CAIP-2 form: `eip155:8453` is Base, `eip155:42220` is Celo.
 */
const PAY_NETWORK = (process.env.HASHPROOF_PAY_NETWORK?.trim() ||
  "eip155:8453") as `${string}:${string}`;

/**
 * Who the credential is issued as.
 *
 * An API key issues as ITS OWN entity, and HashProof rejects any request whose
 * `issuer.slug` names a different one — a flat 403, after the donation has
 * already settled. Since the slug that belongs to a given key is not something
 * this code can know, an explicitly configured slug is sent and anything else
 * is omitted so HashProof fills it in from the key itself.
 *
 * Set HASHPROOF_ISSUER_SLUG only to the entity the key actually belongs to.
 * The x402 wallet path has no such constraint.
 */
function issuerFields(): Record<string, unknown> {
  const slug = process.env.HASHPROOF_ISSUER_SLUG?.trim();
  if (!slug) return {};
  const issuer = {
    display_name: process.env.HASHPROOF_ISSUER_NAME?.trim() || "DonaOnchain",
    slug,
  };
  return { issuer, platform: issuer };
}

export type IssuedCredential = {
  id: string;
  verification_url: string;
  tx_hash: string;
  ipfs_cid: string;
};

type IssueInput = {
  donorName: string;
  amountUsd: number;
  paidAt: string | null;
};

/**
 * Builds a payment-capable fetch. Kept behind a lazy dynamic import so the
 * x402 and viem bundles never load on a request that is not issuing anything.
 */
async function paidFetch(): Promise<typeof globalThis.fetch> {
  const apiKey = process.env.HASHPROOF_API_KEY?.trim();
  if (apiKey) {
    // Prepaid credits — one header, no wallet, no signing.
    return (input, init) =>
      globalThis.fetch(input, {
        ...init,
        headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${apiKey}` },
      });
  }

  const { wrapFetchWithPaymentFromConfig } = await import("@x402/fetch");
  const { ExactEvmScheme } = await import("@x402/evm");
  const { privateKeyToAccount } = await import("viem/accounts");

  const raw = process.env.HASHPROOF_WALLET_PRIVATE_KEY!.trim();
  const account = privateKeyToAccount(
    (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`,
  );

  return wrapFetchWithPaymentFromConfig(globalThis.fetch, {
    schemes: [{ network: PAY_NETWORK, client: new ExactEvmScheme(account) }],
  });
}

/**
 * The custom certificate template.
 *
 * The artwork already carries every fixed line — the DonaOnchain mark, "WE
 * STAND WITH COLOMBIA", the sentence about the community and the site address
 * — so the template contributes exactly one field: the holder's name, sitting
 * inside the dashed box the design leaves for it.
 *
 * IT IS REFERENCED BY SLUG, NOT REDEFINED. Sending the definition creates the
 * template, and it can only be created once: every issuance after the first
 * came back `400 template_conflict — Template already exists. Use
 * template_slug or template_id.` and returned no certificate at all. The full
 * definition below is therefore the FALLBACK, sent only when the slug turns
 * out not to exist yet.
 */
const TEMPLATE_SLUG =
  process.env.HASHPROOF_TEMPLATE_SLUG?.trim() || "donaonchain-colombia-2026";

/**
 * The definition used to create the template the first time.
 *
 * Coordinates are in the background's own pixels (1122 × 1402). The dashed box
 * runs roughly x 151→965, y 589→823, so the name is placed centred within it.
 *
 * HashProof fetches the background over the public internet — there is no
 * upload endpoint — so HASHPROOF_BACKGROUND_URL must be a URL it can reach. A
 * preview deployment behind Vercel Auth will NOT work; use the production
 * domain. Without it there is nothing to create, and the default HashProof
 * design is used instead.
 */
function templateDefinition(): Record<string, unknown> | null {
  const background = process.env.HASHPROOF_BACKGROUND_URL?.trim();
  if (!background) return null;

  return {
    template: {
      slug: TEMPLATE_SLUG,
      name: "DonaOnchain — We Stand With Colombia",
      background_url: background,
      page_width: 1122,
      page_height: 1402,
      // Validated against the free preview endpoint with both a short name
      // and a long organisation name. HashProof wraps overflow onto further
      // lines that grow DOWNWARD, so an oversized font pushed a two-line name
      // straight through the box and into the printed paragraph below.
      fields_json: [
        {
          key: "holder_name",
          x: 171,
          y: 665,
          width: 774,
          required: true,
          font_size: 58,
          font_color: "#1B3A6B",
          align: "center",
        },
      ],
    },
  };
}

/** Whether a failure means "that slug does not exist yet", not "bad request". */
function templateMissing(status: number, body: string): boolean {
  return (
    status === 404 ||
    /template_not_found|template not found|does not exist|unknown template/i.test(body)
  );
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Issues a donation certificate. Returns null on any failure or when disabled
 * — never throws, so a caller in a webhook path cannot be broken by it.
 */
export async function issueDonationCertificate(
  input: IssueInput,
): Promise<IssuedCredential | null> {
  if (!certificatesEnabled()) return null;
  if (!input.donorName.trim()) return null;

  const name = input.donorName.trim().slice(0, MAX_DONOR_NAME);
  const date = input.paidAt
    ? new Date(input.paidAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "";

  const base = {
    ...issuerFields(),
    holder: { full_name: name },
    context: {
      type: "other",
      title: "Colombia Earthquake Relief — August 2026",
    },
    credential_type: "participation",
    title: "We Stand With Colombia",
    values: {
      holder_name: name,
      // Kept for the default template and for the credential's metadata. The
      // custom artwork prints only the name, so this never appears on it.
      details: `Contributed ${formatUsd(input.amountUsd)} to earthquake relief in Colombia${
        date ? ` on ${date}` : ""
      }.`,
    },
  };

  const definition = templateDefinition();

  try {
    const doFetch = await paidFetch();
    const post = (extra: Record<string, unknown>) =>
      doFetch(ISSUE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, ...extra }),
      });

    // Reference the template, never redefine it. Only one of template_slug,
    // template_id and template may be sent at all.
    let res = await post(definition ? { template_slug: TEMPLATE_SLUG } : {});

    if (!res.ok) {
      const body = await res.text();

      // First run on a fresh HashProof account: the slug does not exist yet,
      // so send the definition once to create it. Any other failure is not
      // something a second paid attempt would fix.
      if (definition && templateMissing(res.status, body)) {
        console.warn(`[hashproof] template ${TEMPLATE_SLUG} missing — creating it`);
        res = await post(definition);
        if (!res.ok) {
          console.error("[hashproof] creation failed", res.status, await res.text());
          return null;
        }
      } else {
        console.error("[hashproof] issuance failed", res.status, body);
        return null;
      }
    }

    return (await res.json()) as IssuedCredential;
  } catch (err) {
    console.error("[hashproof] issuance threw", err);
    return null;
  }
}
