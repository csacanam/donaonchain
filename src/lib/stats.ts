import { revalidateTag, unstable_cache } from "next/cache";
import { getStats, type CampaignStats } from "./store";
import { getOnchainView, type OnchainView } from "./onchain";

/**
 * Cached campaign stats.
 *
 * The Upstash free tier bills per command, and the landing page is the thing
 * we most want to survive a traffic spike. Caching means Redis is touched on
 * revalidation rather than once per visitor, while the webhook invalidates the
 * tag the moment a payment settles — so the counter is fresh when it matters
 * and cheap the rest of the time.
 */

export const STATS_TAG = "campaign-stats";
export const ONCHAIN_TAG = "onchain-movements";

/**
 * Next 16's `revalidateTag` requires a cache-life profile. `expire: 0` drops
 * the stale entry immediately, which is what a settled donation warrants —
 * the counter is the number donors check, and serving it stale right after a
 * payment lands undersells the campaign to the person who just gave.
 */
export function refreshStats(): void {
  revalidateTag(STATS_TAG, { expire: 0 });
}

export const getCachedStats = unstable_cache(
  async (): Promise<CampaignStats> => getStats(12),
  ["campaign-stats"],
  { tags: [STATS_TAG], revalidate: 60 },
);

/**
 * On-chain movements, cached harder than the donation counter.
 *
 * A cold read walks block ranges across public RPCs and can take seconds, so
 * it must not run per visitor. Five minutes is well inside how fast anyone
 * reconciles a treasury by hand, and the data is verifiable independently
 * regardless of how stale this copy is.
 */
export const getCachedOnchain = unstable_cache(
  async (): Promise<OnchainView> => getOnchainView(25),
  ["onchain-movements"],
  { tags: [ONCHAIN_TAG], revalidate: 300 },
);
