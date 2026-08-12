import {
  Campaign,
  type LedgerEntry,
  type MovementEntry,
} from "@/components/Campaign";
import {
  certificatesEnabled,
  donationsEnabled,
  explorerUrl,
  intakeAddress,
  networkLabel,
  SITE,
  treasuryAddress,
} from "@/lib/config";
import { getCachedOnchain, getCachedStats } from "@/lib/stats";
import { trackedAddresses } from "@/lib/onchain";

export default async function HomePage() {
  // Independent reads: the on-chain scan is the slow one, so it must not sit
  // behind the Redis counter.
  const [stats, onchain] = await Promise.all([getCachedStats(), getCachedOnchain()]);

  // Explorer URLs and network labels are resolved here rather than in the
  // client component, so the browser bundle never carries the chain lookup
  // tables and the client is handed display-ready values.
  const ledger: LedgerEntry[] = stats.recent.map((d) => ({
    amountUsd: d.amountUsd,
    donorName: d.donorName,
    paidAt: d.paidAt,
    token: d.token,
    networkLabel: networkLabel(d.network),
    txUrl: explorerUrl(d.network, d.txHash),
    certificateUrl: d.certificateUrl,
  }));

  const tracked = trackedAddresses();
  const movements: MovementEntry[] = onchain.movements.map((m) => ({
    chainLabel: m.chainLabel,
    direction: m.direction,
    amount: m.amount,
    symbol: m.symbol,
    // Show the address that is NOT ours — the donor for an inflow, the
    // beneficiary for a disbursement. Our own two addresses are already
    // published above the table.
    counterparty:
      m.direction === "in" || m.direction === "internal" ? m.from : m.to,
    txUrl: m.txUrl,
  }));

  return (
    <Campaign
      donationsEnabled={donationsEnabled()}
      certificatesEnabled={certificatesEnabled()}
      statsAvailable={stats.available}
      totalUsd={stats.totalUsd}
      donorCount={stats.donorCount}
      ledger={ledger}
      intakeAddress={intakeAddress() ?? tracked.intake}
      treasuryAddress={treasuryAddress() ?? tracked.treasury}
      onchainConfigured={onchain.configured}
      movements={movements}
      contactEmail={SITE.contactEmail}
    />
  );
}
