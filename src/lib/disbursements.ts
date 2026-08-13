/**
 * What ReFi Colombia has actually handed out, and to whom.
 *
 * This is the one stage of the money's journey that a blockchain cannot answer
 * on its own. Donations arriving is verifiable; a withdrawal is verifiable; a
 * transfer between wallets is verifiable. "This bought 200 food parcels for a
 * foundation in Cali" is not — and pretending otherwise is exactly the move
 * this site exists to argue against.
 *
 * So each entry declares which of the two it is, and the page shows them
 * differently:
 *
 *  - `onchain` — paid in stablecoins, with a transaction hash. Anyone can
 *    check it in ten seconds and nobody has to trust us.
 *  - `reported` — paid in pesos, or spent offchain. ReFi Colombia says it
 *    happened and attaches what evidence exists. That is a claim with
 *    documents behind it, not a proof, and the page must never dress it up as
 *    one.
 *
 * ## Adding an entry
 *
 * ReFi Colombia sends the details; add them here and deploy. Keep the list in
 * chronological order, oldest first.
 *
 * Before publishing evidence, check it for other people's data. Receipts carry
 * names and ID numbers, and photographs carry faces of people at the worst
 * moment of their lives. Redact identification numbers, and publish no
 * recognisable face without that person's consent. A page that exposes the
 * people it claims to be helping has failed at something more important than
 * transparency.
 */
export type Disbursement = {
  /** ISO date the funds left ReFi Colombia's hands. */
  date: string;

  /** Who received it. A foundation, an organisation, a community. */
  recipient: string;

  /** What it was for, in one line. Both languages: donors read both. */
  purpose: { en: string; es: string };

  amount: number;
  /** "USDT", "USDC" for onchain; "COP" for a peso transfer. */
  currency: string;

  kind: "onchain" | "reported";

  /** Required when `kind` is "onchain": the transfer, on a block explorer. */
  txUrl?: string;

  /**
   * Evidence for a `reported` entry — a receipt, a photograph, a public post
   * by the recipient. Optional, because an entry with no documents yet is
   * still better published than withheld; the page will say plainly that it
   * carries none.
   */
  evidence?: { label: { en: string; es: string }; url: string }[];
};

/**
 * Empty on purpose. Nothing has been disbursed yet: the donations received so
 * far were withdrawn from Voulti and swept into ReFi Colombia's treasury, and
 * both of those movements are already visible in the movements table. The
 * section renders only once this list has something in it — an empty
 * "disbursements" heading would read as a promise the page cannot keep.
 */
export const DISBURSEMENTS: Disbursement[] = [];
