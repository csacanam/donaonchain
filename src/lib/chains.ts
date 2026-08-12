/**
 * Chain and stablecoin registry for on-chain tracking.
 *
 * NOTE ON DECIMALS: USDC and USDT are 6-decimal tokens on Celo, Base, Arbitrum
 * and Polygon — but the Binance-Peg versions on BSC are **18 decimals**.
 * Formatting a BSC transfer with 6 decimals reports a $50 donation as
 * $50,000,000,000,000. Decimals are therefore carried per token, never assumed
 * per symbol.
 */

export type TokenSpec = {
  symbol: "USDC" | "USDT";
  address: `0x${string}`;
  decimals: number;
};

export type ChainSpec = {
  /** Voulti's lower-case `paid_network` value. */
  key: string;
  id: number;
  label: string;
  rpc: string;
  explorerTx: string;
  explorerAddress: string;
  tokens: TokenSpec[];
  /**
   * Max blocks per eth_getLogs call. These were measured against the RPCs
   * above on 2026-08-11, not guessed — Celo's forno rejects 10k outright, and
   * so does publicnode's BSC. A too-large value here does not degrade the
   * scan, it fails every request and leaves the transparency section
   * permanently empty. Re-measure if you change an endpoint.
   */
  maxLogRange: bigint;
};

export const CHAINS: ChainSpec[] = [
  {
    key: "celo",
    id: 42220,
    label: "Celo",
    rpc: process.env.RPC_CELO?.trim() || "https://forno.celo.org",
    explorerTx: "https://celoscan.io/tx/",
    explorerAddress: "https://celoscan.io/address/",
    maxLogRange: 5_000n,
    tokens: [
      {
        symbol: "USDC",
        address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
        decimals: 6,
      },
      {
        symbol: "USDT",
        address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
        decimals: 6,
      },
    ],
  },
  {
    key: "base",
    id: 8453,
    label: "Base",
    rpc: process.env.RPC_BASE?.trim() || "https://mainnet.base.org",
    explorerTx: "https://basescan.org/tx/",
    explorerAddress: "https://basescan.org/address/",
    maxLogRange: 10_000n,
    tokens: [
      {
        symbol: "USDC",
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
      },
      {
        symbol: "USDT",
        address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        decimals: 6,
      },
    ],
  },
  {
    key: "arbitrum",
    id: 42161,
    label: "Arbitrum One",
    rpc: process.env.RPC_ARBITRUM?.trim() || "https://arb1.arbitrum.io/rpc",
    explorerTx: "https://arbiscan.io/tx/",
    explorerAddress: "https://arbiscan.io/address/",
    maxLogRange: 10_000n,
    tokens: [
      {
        symbol: "USDC",
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        decimals: 6,
      },
      {
        symbol: "USDT",
        address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        decimals: 6,
      },
    ],
  },
  {
    key: "polygon",
    id: 137,
    label: "Polygon",
    rpc: process.env.RPC_POLYGON?.trim() || "https://polygon-bor-rpc.publicnode.com",
    explorerTx: "https://polygonscan.com/tx/",
    explorerAddress: "https://polygonscan.com/address/",
    maxLogRange: 10_000n,
    tokens: [
      {
        symbol: "USDC",
        address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        decimals: 6,
      },
      {
        symbol: "USDT",
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        decimals: 6,
      },
    ],
  },
  {
    key: "bsc",
    id: 56,
    label: "BNB Chain",
    rpc: process.env.RPC_BSC?.trim() || "https://bsc-rpc.publicnode.com",
    explorerTx: "https://bscscan.com/tx/",
    explorerAddress: "https://bscscan.com/address/",
    // Production saw InvalidParams from this endpoint at 5k despite it passing
    // in isolation; 1k is what it reliably accepts under load.
    maxLogRange: 1_000n,
    tokens: [
      // Binance-Peg tokens — 18 decimals, unlike every other chain here.
      {
        symbol: "USDC",
        address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        decimals: 18,
      },
      {
        symbol: "USDT",
        address: "0x55d398326f99059fF775485246999027B3197955",
        decimals: 18,
      },
    ],
  },
];

export function chainByKey(key: string): ChainSpec | undefined {
  return CHAINS.find((c) => c.key === key.toLowerCase());
}

/**
 * Where to begin scanning each chain, one variable per chain.
 *
 * Block heights are not comparable across networks — Celo was around 74.5M
 * while Base was at 49.8M on the same day. A single shared start block is
 * therefore not merely imprecise: applied to a chain whose head is lower, it
 * puts `from` past `head` and the scan silently returns nothing at all.
 *
 * Listed explicitly rather than built from the key, so a missing entry is
 * visible here instead of failing as an undefined lookup at runtime.
 */
const START_BLOCKS: Record<string, string | undefined> = {
  celo: process.env.ONCHAIN_START_CELO,
  base: process.env.ONCHAIN_START_BASE,
  arbitrum: process.env.ONCHAIN_START_ARBITRUM,
  polygon: process.env.ONCHAIN_START_POLYGON,
  bsc: process.env.ONCHAIN_START_BSC,
};

export function startBlockFor(chain: ChainSpec): bigint | null {
  const raw = START_BLOCKS[chain.key]?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

/**
 * Which chains to scan. Defaults to Celo alone: scanning five chains on public
 * RPCs is slow and mostly wasted if donations only ever arrive on one. Set
 * ONCHAIN_CHAINS to a comma-separated list of keys to widen it.
 */
export function trackedChains(): ChainSpec[] {
  const raw = process.env.ONCHAIN_CHAINS?.trim();
  if (!raw) return CHAINS.filter((c) => c.key === "celo");
  const keys = raw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  return CHAINS.filter((c) => keys.includes(c.key));
}
