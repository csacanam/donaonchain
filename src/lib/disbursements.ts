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
 * The first disbursement went through an intermediary, and the entry says so
 * rather than flattening it into one clean hop:
 *
 *  1. On 16 Sep 2026 the stablecoins went onchain to wallets of a person who
 *     converted them to pesos: 999,371.45 COPm on Celo from ReFi Colombia's
 *     Safe (0x8c5f…b7c5 → 0x4263…317a), and 14.86 USDC on Base plus 24.77
 *     USDC on Polygon withdrawn straight from Voulti's settlement contracts
 *     (→ 0x4173…2d2c). The two USDC withdrawals never touch the intake
 *     wallet, so they do not appear in the movements table — the links below
 *     are the only place a reader can see them.
 *  2. On 21 Sep 2026 COP 1,115,000 was sent to Margen by Bre-B transfer.
 *
 * Step 1 is verifiable; step 2 is a screenshot. The last hop is pesos, so the
 * entry as a whole is `reported`, with the onchain legs attached as evidence.
 */
export const DISBURSEMENTS: Disbursement[] = [
  {
    date: "2026-09-21",
    recipient: "Margen",
    purpose: {
      en: "All donations received so far (999,371 COPm + 39.63 USDC), converted to pesos by an intermediary and sent to the foundation by bank transfer.",
      es: "Todas las donaciones recibidas hasta ahora (999.371 COPm + 39,63 USDC), convertidas a pesos por un intermediario y enviadas a la fundación por transferencia bancaria.",
    },
    amount: 1_115_000,
    currency: "COP",
    kind: "reported",
    evidence: [
      {
        label: { en: "Tx 1: 999,371 COPm (Celo)", es: "Tx 1: 999.371 COPm (Celo)" },
        url: "https://celo.blockscout.com/tx/0xddbf55d397ccde5f42ec1030e526dd4407d8c941251c74b3a00320ed5df00202",
      },
      {
        label: { en: "Tx 2: 14.86 USDC (Base)", es: "Tx 2: 14,86 USDC (Base)" },
        url: "https://basescan.org/tx/0x3fe35e957e0489171740756607c32649ef2148ee906f870d44074202d4e43d04",
      },
      {
        label: { en: "Tx 3: 24.77 USDC (Polygon)", es: "Tx 3: 24,77 USDC (Polygon)" },
        url: "https://polygonscan.com/tx/0xdee5eddd8c31896142763d9da25e181bab55eb587ae8a3abb44953cfe6f5d618",
      },
      {
        label: {
          en: "Peso transfer receipt and conversation with Margen",
          es: "Comprobante de la transferencia y conversación con Margen",
        },
        url: "/evidence/margen-transferencia-2026-09-21.jpg",
      },
    ],
  },
];
