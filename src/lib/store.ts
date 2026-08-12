import { Redis } from "@upstash/redis";
import { createRedis, redisConfigured } from "./config";

/**
 * Persistence for donations.
 *
 * Voulti has no endpoint that lists a commerce's invoices — the only public
 * reads are one invoice at a time. So every invoice id we create must be
 * stored here at creation time or it is lost for good, and with it any hope
 * of a running total.
 */

export type DonationStatus = "Pending" | "Paid" | "Expired" | "Refunded";

export type DonationRecord = {
  invoiceId: string;
  reference: string;
  amountUsd: number;
  donorName: string | null;
  /**
   * Whether the donor agreed to appear by name in the public ledger.
   *
   * Separate from `donorName` on purpose: a donor may give a name purely so a
   * certificate can be issued to them, which is not consent to be listed on a
   * public page next to what they gave.
   */
  showName: boolean;
  /** Never leaves the server — stripped from every public projection. */
  donorEmail: string | null;
  status: DonationStatus;
  createdAt: string;
  paidAt: string | null;
  txHash: string | null;
  network: string | null;
  token: string | null;
  /** Crypto units actually transferred, e.g. 25.0031 USDC. Not the fiat total. */
  paidAmount: number | null;
  certificateUrl: string | null;
};

/** What the public ledger is allowed to see. */
export type PublicDonation = Pick<
  DonationRecord,
  "amountUsd" | "donorName" | "paidAt" | "txHash" | "network" | "token" | "certificateUrl"
>;

export type CampaignStats = {
  totalUsd: number;
  donorCount: number;
  recent: PublicDonation[];
  /** False when Redis is not provisioned — the UI hides the counter entirely. */
  available: boolean;
};

const KEYS = {
  donation: (id: string) => `donation:${id}`,
  settled: "donations:settled",
  totalUsd: "stats:total_usd",
  donorCount: "stats:donor_count",
  seen: (id: string, status: string) => `seen:${id}:${status}`,
  certLock: (id: string) => `cert:lock:${id}`,
};

let client: Redis | null = null;

function redis(): Redis | null {
  if (!redisConfigured()) return null;
  if (!client) client = createRedis();
  return client;
}

export async function saveDonation(record: DonationRecord): Promise<void> {
  const r = redis();
  if (!r) return;
  await r.set(KEYS.donation(record.invoiceId), record);
}

export async function getDonation(invoiceId: string): Promise<DonationRecord | null> {
  const r = redis();
  if (!r) return null;
  return (await r.get<DonationRecord>(KEYS.donation(invoiceId))) ?? null;
}

/**
 * Promote a donation to settled and move the campaign totals.
 *
 * Guarded by the sorted-set add: `zadd` reports how many members were newly
 * added, so a replayed webhook for an invoice already counted returns 0 and
 * the totals are left alone. Without that guard a duplicate delivery — which
 * the docs promise will happen — would inflate the public counter, and an
 * inflated donation counter is not a cosmetic bug.
 */
export async function recordSettlement(record: DonationRecord): Promise<boolean> {
  const r = redis();
  if (!r) return false;

  const paidAtMs = record.paidAt ? Date.parse(record.paidAt) : Date.now();
  const added = await r.zadd(
    KEYS.settled,
    { nx: true },
    { score: paidAtMs, member: record.invoiceId },
  );

  await r.set(KEYS.donation(record.invoiceId), record);

  if (added) {
    await r.incrbyfloat(KEYS.totalUsd, record.amountUsd);
    await r.incr(KEYS.donorCount);
  }
  return Boolean(added);
}

export async function getStats(limit = 12): Promise<CampaignStats> {
  const r = redis();
  if (!r) {
    return { totalUsd: 0, donorCount: 0, recent: [], available: false };
  }

  const [totalRaw, countRaw, ids] = await Promise.all([
    r.get<string | number>(KEYS.totalUsd),
    r.get<string | number>(KEYS.donorCount),
    r.zrange<string[]>(KEYS.settled, 0, limit - 1, { rev: true }),
  ]);

  let recent: PublicDonation[] = [];
  if (ids.length > 0) {
    const records = await r.mget<(DonationRecord | null)[]>(
      ...ids.map((id) => KEYS.donation(id)),
    );
    recent = records.filter((d): d is DonationRecord => d !== null).map(toPublic);
  }

  return {
    totalUsd: Number(totalRaw ?? 0),
    donorCount: Number(countRaw ?? 0),
    recent,
    available: true,
  };
}

export function toPublic(d: DonationRecord): PublicDonation {
  return {
    amountUsd: d.amountUsd,
    // Withheld unless the donor explicitly opted in. Records written before
    // this flag existed have `showName` undefined, and undefined must read as
    // "no consent" — the safe direction when the answer is unknown.
    donorName: d.showName === true ? d.donorName : null,
    paidAt: d.paidAt,
    txHash: d.txHash,
    network: d.network,
    token: d.token,
    certificateUrl: d.certificateUrl,
  };
}

/**
 * Webhook deduplication, keyed on invoice id AND status.
 *
 * Keying on the id alone would swallow the legitimate second delivery when an
 * invoice goes Expired and later Refunded, leaving the record stuck on the
 * wrong status.
 */
export async function alreadyHandled(invoiceId: string, status: string): Promise<boolean> {
  const r = redis();
  if (!r) return false;
  return (await r.exists(KEYS.seen(invoiceId, status))) === 1;
}

/**
 * Reserves the right to attempt ONE certificate issuance for this invoice.
 *
 * Two paths can reach issuance for the same donation — the webhook and the
 * thank-you page's poll — and issuance spends $0.10 and writes to a chain that
 * cannot be edited afterwards. `SET NX` hands the attempt to exactly one of
 * them.
 *
 * The TTL is the point: a lock that never expired would turn one failed
 * attempt into a donation that can never get its certificate, and no lock at
 * all would let a slow first attempt and a later poll both succeed and mint two
 * credentials for one donation.
 */
export async function claimCertificateAttempt(
  invoiceId: string,
  seconds = 120,
): Promise<boolean> {
  const r = redis();
  // Without Redis there is no stored donor name either, so nothing reaches
  // issuance by this route anyway; refusing here would only mask that.
  if (!r) return true;
  const claimed = await r.set(KEYS.certLock(invoiceId), 1, { nx: true, ex: seconds });
  return claimed === "OK";
}

/**
 * Call this only AFTER the work succeeded. Marking a delivery seen on arrival
 * looks safer and is the opposite: if fulfilment then fails, every retry is
 * discarded as a duplicate and the donation is never recorded.
 */
export async function markHandled(invoiceId: string, status: string): Promise<void> {
  const r = redis();
  if (!r) return;
  // 30 days comfortably outlives the ~2-day retry schedule.
  await r.set(KEYS.seen(invoiceId, status), 1, { ex: 60 * 60 * 24 * 30 });
}
