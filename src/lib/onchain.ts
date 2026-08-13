import { createPublicClient, http, parseAbiItem, formatUnits, type Log } from "viem";
import { Redis } from "@upstash/redis";
import { createRedis, redisConfigured } from "./config";
import { startBlockFor, trackedChains, type ChainSpec } from "./chains";

/**
 * Reads stablecoin movements for the campaign's two addresses straight from
 * the chain, rather than trusting our own database.
 *
 * The point of this module is that a donor does not have to believe us. Our
 * Redis counter can be wrong, or edited; a Transfer log cannot. Everything
 * here is reproducible by anyone with the two addresses and a public RPC.
 */

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

/**
 * A sweep from the intake wallet to the treasury is neither a donation nor a
 * disbursement — it is the same money moving between two addresses we track.
 * Classifying it as an outflow of one and an inflow of the other would count
 * every donation twice, which is exactly the sort of inflated number a
 * transparency page exists to prevent.
 */
export type MovementDirection = "in" | "out" | "internal";

export type Movement = {
  chainKey: string;
  chainLabel: string;
  direction: MovementDirection;
  amount: number;
  symbol: string;
  from: string;
  to: string;
  txHash: string;
  txUrl: string;
  blockNumber: number;
  /**
   * Part of the stored identity. A sorted-set member is deduped by its exact
   * bytes, so two transfers of the same amount inside one transaction would
   * otherwise collapse into a single row and under-report the total.
   */
  logIndex: number;
};

export type OnchainView = {
  /** False when no addresses are configured — the UI says so plainly. */
  configured: boolean;
  movements: Movement[];
  totalIn: number;
  totalOut: number;
  /** True when the scan hit its per-request budget and older history is missing. */
  partial: boolean;
};

const EMPTY: OnchainView = {
  configured: false,
  movements: [],
  totalIn: 0,
  totalOut: 0,
  partial: false,
};

/** Bounds one invocation so a cold cache cannot hang the page indefinitely. */
const MAX_CHUNKS_PER_CHAIN = 12;

/**
 * The wallet this section is about.
 *
 * There used to be a second one — a treasury the intake wallet was swept into
 * — and the reader still understands transfers between two tracked addresses
 * (see `internal` below). It deliberately no longer reads a treasury from the
 * environment: the site publishes one wallet, so anything leaving it is an
 * outflow a donor should see, not an internal move to hide.
 */
export function trackedAddresses(): { intake: string | null } {
  const norm = (v?: string) => {
    const t = v?.trim();
    return t && /^0x[a-fA-F0-9]{40}$/.test(t) ? t.toLowerCase() : null;
  };
  return { intake: norm(process.env.NEXT_PUBLIC_INTAKE_ADDRESS) };
}

let redisClient: Redis | null = null;
function redis(): Redis | null {
  if (!redisConfigured()) return null;
  if (!redisClient) redisClient = createRedis();
  return redisClient;
}

const cursorKey = (chain: string) => `onchain:cursor:${chain}`;
const movesKey = (chain: string) => `onchain:moves:${chain}`;

function classify(
  from: string,
  to: string,
  tracked: Set<string>,
): MovementDirection | null {
  const fromTracked = tracked.has(from.toLowerCase());
  const toTracked = tracked.has(to.toLowerCase());
  if (fromTracked && toTracked) return "internal";
  if (toTracked) return "in";
  if (fromTracked) return "out";
  return null; // Should not happen: we filter by these addresses at the RPC.
}

type TransferLog = Awaited<
  ReturnType<
    ReturnType<typeof createPublicClient>["getLogs"]
  >
>[number];

/**
 * Fetches Transfer logs for a block range, halving the range on failure.
 *
 * Even a range within the node's block limit can be rejected for returning too
 * many results — Celo's forno caps responses at 20,000 regardless of span. A
 * fixed chunk size cannot know in advance which ranges are busy, so this backs
 * off by bisecting rather than giving up on the whole scan.
 */
async function getLogsAdaptive(
  client: ReturnType<typeof createPublicClient>,
  tokens: `0x${string}`[],
  addresses: string[],
  from: bigint,
  to: bigint,
  depth = 0,
): Promise<TransferLog[]> {
  try {
    // Two queries per range: one where a tracked address sent, one where it
    // received. eth_getLogs cannot OR across different topic positions.
    const [outbound, inbound] = await Promise.all([
      client.getLogs({
        address: tokens,
        event: TRANSFER_EVENT,
        args: { from: addresses as `0x${string}`[] },
        fromBlock: from,
        toBlock: to,
      }),
      client.getLogs({
        address: tokens,
        event: TRANSFER_EVENT,
        args: { to: addresses as `0x${string}`[] },
        fromBlock: from,
        toBlock: to,
      }),
    ]);
    return [...outbound, ...inbound] as TransferLog[];
  } catch (err) {
    if (depth >= 4 || to <= from) throw err;
    const mid = from + (to - from) / 2n;
    const [a, b] = await Promise.all([
      getLogsAdaptive(client, tokens, addresses, from, mid, depth + 1),
      getLogsAdaptive(client, tokens, addresses, mid + 1n, to, depth + 1),
    ]);
    return [...a, ...b];
  }
}

async function scanChain(
  chain: ChainSpec,
  addresses: string[],
  tracked: Set<string>,
): Promise<{ movements: Movement[]; partial: boolean }> {
  const client = createPublicClient({ transport: http(chain.rpc) });
  const head = await client.getBlockNumber();

  const r = redis();
  const stored = r ? await r.get<string>(cursorKey(chain.key)) : null;

  const configuredStart = startBlockFor(chain);
  const fallbackWindow = chain.maxLogRange * BigInt(MAX_CHUNKS_PER_CHAIN);

  // Without a stored cursor we scan backwards from head rather than forwards
  // from genesis: a full history scan on a public RPC would be thousands of
  // requests and time out long before it finished.
  let from = stored
    ? BigInt(stored) + 1n
    : configuredStart !== null
      ? configuredStart
      : head > fallbackWindow
        ? head - fallbackWindow
        : 0n;

  // A start block past this chain's head means it was copied from a different
  // network. Fall back to the recent window rather than returning nothing.
  if (from > head) {
    if (stored) return { movements: [], partial: false }; // Simply caught up.
    console.warn(
      `[onchain] start block ${from} exceeds ${chain.key} head ${head} — using recent window`,
    );
    from = head > fallbackWindow ? head - fallbackWindow : 0n;
  }

  const tokens = chain.tokens.map((t) => t.address);
  const decimalsByToken = new Map(
    chain.tokens.map((t) => [t.address.toLowerCase(), t] as const),
  );

  const movements: Movement[] = [];
  let chunks = 0;
  let partial = false;

  while (from <= head) {
    if (chunks >= MAX_CHUNKS_PER_CHAIN) {
      partial = true;
      break;
    }
    const to = from + chain.maxLogRange - 1n > head ? head : from + chain.maxLogRange - 1n;

    const logs = await getLogsAdaptive(client, tokens, addresses, from, to);

    const seen = new Set<string>();
    for (const log of logs) {
      // A sweep between the two tracked addresses matches BOTH queries.
      const id = `${log.transactionHash}:${log.logIndex}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const parsed = log as Log<bigint, number, false, typeof TRANSFER_EVENT>;
      const args = parsed.args as { from?: string; to?: string; value?: bigint };
      if (!args.from || !args.to || args.value === undefined) continue;

      const token = decimalsByToken.get(parsed.address.toLowerCase());
      if (!token) continue;

      const direction = classify(args.from, args.to, tracked);
      if (!direction) continue;

      movements.push({
        chainKey: chain.key,
        chainLabel: chain.label,
        direction,
        amount: Number(formatUnits(args.value, token.decimals)),
        symbol: token.symbol,
        from: args.from,
        to: args.to,
        txHash: parsed.transactionHash!,
        txUrl: `${chain.explorerTx}${parsed.transactionHash}`,
        blockNumber: Number(parsed.blockNumber),
        logIndex: Number(parsed.logIndex),
      });
    }

    from = to + 1n;
    chunks += 1;
  }

  if (r) {
    // Persist so the next pass resumes instead of rescanning, and so history
    // survives beyond the window a single request can cover.
    if (movements.length > 0) {
      const [first, ...rest] = movements.map((m) => ({
        score: m.blockNumber,
        member: JSON.stringify(m),
      }));
      await r.zadd(movesKey(chain.key), first, ...rest);
    }
    await r.set(cursorKey(chain.key), (from - 1n).toString());
  }

  return { movements, partial };
}

/**
 * Reads movements recorded by earlier passes.
 *
 * Members are written with `JSON.stringify`, but they do NOT come back as
 * strings: the Upstash client sees JSON on the way out and deserialises it, so
 * `zrange` hands back objects. Parsing them again threw on every single entry,
 * and the `catch` turned that into an empty list — the movements table sat
 * saying "nothing has moved through this wallet" while two transfers were
 * stored and readable. Both shapes are accepted here so neither the current
 * client nor a raw string written by an older one is silently dropped.
 */
async function loadStored(chainKey: string, limit: number): Promise<Movement[]> {
  const r = redis();
  if (!r) return [];
  const raw = await r.zrange<unknown[]>(movesKey(chainKey), 0, limit - 1, { rev: true });
  return raw
    .map((entry) => {
      if (typeof entry === "string") {
        try {
          return JSON.parse(entry) as Movement;
        } catch {
          return null;
        }
      }
      return entry && typeof entry === "object" ? (entry as Movement) : null;
    })
    .filter((m): m is Movement => m !== null);
}

export async function getOnchainView(limit = 25): Promise<OnchainView> {
  const { intake } = trackedAddresses();
  const addresses = [intake].filter((a): a is string => a !== null);
  if (addresses.length === 0) return EMPTY;

  const tracked = new Set(addresses);
  const chains = trackedChains();

  const results = await Promise.allSettled(
    chains.map(async (chain) => {
      const fresh = await scanChain(chain, addresses, tracked);
      // Both sources are needed. The stored set carries history from earlier
      // passes, but it is empty whenever Redis is unprovisioned — returning
      // only that would leave this section permanently blank even though the
      // scan itself worked.
      const stored = await loadStored(chain.key, limit);
      return { found: [...fresh.movements, ...stored], partial: fresh.partial };
    }),
  );

  const collected: Movement[] = [];
  let partial = false;

  for (const [i, res] of results.entries()) {
    if (res.status === "fulfilled") {
      collected.push(...res.value.found);
      partial = partial || res.value.partial;
    } else {
      // One unreachable RPC must not blank the whole section.
      console.error(`[onchain] scan failed for ${chains[i].key}`, res.reason);
      partial = true;
      collected.push(...(await loadStored(chains[i].key, limit)));
    }
  }

  // The two sources overlap by design: a transfer just scanned is also the one
  // just persisted. Deduplicate on the log's own identity.
  const byId = new Map<string, Movement>();
  for (const m of collected) byId.set(`${m.txHash}:${m.logIndex}`, m);
  const movements = [...byId.values()];

  movements.sort((a, b) => b.blockNumber - a.blockNumber);

  // Internal sweeps are excluded from both totals on purpose — see the note on
  // MovementDirection. They stay visible in the list so the path is legible.
  const totalIn = movements
    .filter((m) => m.direction === "in")
    .reduce((sum, m) => sum + m.amount, 0);
  const totalOut = movements
    .filter((m) => m.direction === "out")
    .reduce((sum, m) => sum + m.amount, 0);

  return {
    configured: true,
    movements: movements.slice(0, limit),
    totalIn,
    totalOut,
    partial,
  };
}
