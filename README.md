# DonaOnchain

Crypto donations for earthquake relief in Cali, Colombia — the 7.4 quake of
10 August 2026. Aimed at the international crypto community: stablecoins in,
every donation published on-chain.

**Funds are received by [ReFi Colombia](https://www.instagram.com/reficolombia)**,
the Colombian node of the ReFi DAO network. Donations settle directly into
their wallet; nobody operating this site holds or can move the money.

Next.js 16 (App Router) · Voulti for payments · Upstash Redis for the counter ·
HashProof for donation certificates.

## What it does

- Takes donations in USDC/USDT on Celo, Base, Arbitrum, Polygon and BSC.
- Publishes a live total, a donor count and a per-donation ledger with links to
  each transaction on the relevant block explorer.
- States plainly where the money is meant to go, and which partnerships are
  confirmed versus still being negotiated.
- Optionally issues a verifiable donation certificate per donor.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev
```

The site is designed to render correctly with **nothing** configured. Missing
credentials degrade specific features rather than breaking the page:

| Missing | Effect |
|---|---|
| `VOULTI_COMMERCE_ID` | Donation form shows an explicit "not live yet" notice and cannot be submitted. |
| `UPSTASH_REDIS_*` | The live counter and ledger are hidden entirely. Donations still work. |
| `VOULTI_WEBHOOK_SECRET` | Webhook rejects every delivery. Settlement is still recorded by the thank-you page's polling backstop. |
| `HASHPROOF_*` | No certificates issued. Donations recorded as normal; certificates can be issued retroactively. |

## The custody design, and why it looks like this

Donations follow: **donor → intake wallet → multi-sig treasury → beneficiaries.**

The intake wallet is a plain EOA, and that is deliberate. Voulti settles to a
single address across every network a commerce enables, and **a Safe deployed
on one chain does not exist at that address on the others** — a donor paying on
Base into a Celo-only Safe sends funds to an address with no contract, which is
recoverable only by redeploying the Safe there with identical parameters, and
sometimes not at all. An EOA is valid on all five chains by construction.

The cost of that choice is that the intake wallet is single-key custody. The
mitigation is operational, not technical: **sweep it to the treasury often.**
The exposure window is exactly the time funds sit in the intake wallet.

If you would rather point Voulti straight at a Safe, that is fine — but then
enable **only** the chain where the Safe is actually deployed, in
app.voulti.com → Account → Networks.

## Going live — checklist

1. **ReFi Colombia creates the Voulti commerce** at
   [app.voulti.com](https://app.voulti.com) — not you. The wallet set at signup
   is where every donation lands, and Voulti never holds funds, so whoever owns
   that account owns the money. This is what lets the site truthfully say the
   organisers cannot move donations.
2. Enable at least one network under **Account → Networks**. A commerce that is
   not whitelisted on-chain anywhere cannot create invoices at all.
3. Copy the `commerce_id` from **Receive Payments → Developers** into
   `VOULTI_COMMERCE_ID`.
4. Set the `confirmation_url` on that same page to
   `https://donaonchain.com/api/webhooks/voulti`, generate a signing secret, and
   copy it into `VOULTI_WEBHOOK_SECRET`.
5. Use **Test my webhook** on that page to confirm the endpoint answers. It
   fires with `invoice_id: 00000000-0000-0000-0000-000000000000`, which cannot
   collide with a real donation's dedupe key.
6. Publish both addresses: `NEXT_PUBLIC_INTAKE_ADDRESS` (the Voulti receiving
   wallet) and `NEXT_PUBLIC_TREASURY_ADDRESS` (the multi-sig). Set
   `ONCHAIN_CHAINS` to the networks actually enabled, and one
   `ONCHAIN_START_<CHAIN>` per chain — heights are **not** comparable across
   networks, so a single shared value would push the cursor past the head on
   the lower chains and silently return nothing.
7. Make one small real donation end to end. There is no sandbox — all five
   networks are mainnet, so keep the test amount small.

## Donor privacy

Donors choose, per donation, between **Anonymous** (the default) and being
listed by name. People and companies who want the visibility appear in the
ledger with their name beside the amount; everyone else appears as *Anonymous*
and their amount still counts.

The consent is stored as `showName` on the donation record, deliberately
separate from `donorName`: a donor may supply a name only so a certificate can
be issued to them, which is not agreement to be published on a page next to
what they gave. `toPublic()` withholds the name unless `showName === true`, so
a record written before the flag existed — where the value is `undefined` —
reads as *no consent*, which is the safe direction when the answer is unknown.

The API applies the same strictness: `body.showName === true` and nothing else.
A string `"true"` does not grant consent.

Emails are never published and never leave the server.

## On-chain reader

`src/lib/onchain.ts` reads ERC-20 `Transfer` logs for both addresses straight
from public RPCs, so the movements table does not depend on our database being
honest. Two things about it are load-bearing:

- **A sweep from intake to treasury is classified `internal` and excluded from
  both totals.** It is the same money moving between two addresses we already
  track; counting it as an outflow of one and an inflow of the other would
  double every donation.
- **`maxLogRange` per chain in `src/lib/chains.ts` was measured, not guessed**
  (2026-08-11). Celo's forno rejects 10k-block ranges outright and so does
  publicnode's BSC; a too-large value does not degrade gracefully, it fails
  every request and leaves the section permanently empty. `polygon-rpc.com` and
  `bsc-dataseed.binance.org` were unusable for `eth_getLogs` at all, which is
  why the defaults point elsewhere. Re-measure if you change an endpoint.

BSC's Binance-Peg USDC/USDT are **18 decimals** while every other chain here is
6. Decimals are carried per token for that reason.

## Current configuration

- The Voulti commerce belongs to **ReFi Colombia**; its id lives in
  `VOULTI_COMMERCE_ID`, not in this file. The id is technically public — the
  API identifies a commerce by it and needs no auth — but writing it down in a
  public repo is an open invitation to generate junk invoices against their
  account.
- Their Voulti dashboard displays totals in COP while invoices are priced
  per-call in USD. That is correct, not a mismatch: Voulti takes the currency
  per invoice and never infers it from the account.
- All five networks are enabled (9 token/network pairs). The settlement wallet
  was verified on 2026-08-11 to have **no contract code on any of the five** —
  a plain EOA, so no chain can strand funds. Re-run that `eth_getCode` check if
  the receiving wallet ever changes.

## Notes for whoever maintains this

Campaign copy, disaster figures, sources and the allocation split all live in
`src/lib/content.ts`. Update `FIGURES.asOf` whenever you touch a number — the
site renders that timestamp next to the figures, so a stale number at least
reads as a dated one.

Organisations shown on the site live in `src/lib/orgs.ts`, split on purpose:
`BUILT_WITH` states a verifiable fact about the stack and needs nobody's
permission, while `RECIPIENT` and `SUPPORTERS` are endorsement claims. Every
entry carries `confirmed`, and anything false is not rendered — flipping one to
true asserts that a written yes exists. An unconfirmed name on a donation page
is a claim donors act on.

Nothing in `ALLOCATION` may carry `status: "confirmed"` until money has actually
moved that way.

Three integration details caused most of the design here, and are easy to
regress:

- **Voulti's response envelope differs by endpoint.** `POST /invoices` wraps the
  invoice in `{ success, data }`; `GET /invoices/:id` returns it bare. The
  webhook calls the id `invoice_id`, the GET calls it `id`.
- **The webhook has a ~2s budget**, and the confirming `GET` alone takes
  1.2–1.8s. The handler verifies the signature, answers `200`, and does
  everything else in `after()`.
- **`Expired` is not final.** Voulti watches the deposit address for 24h after
  expiry and refunds late payments, so an invoice can go `Expired` → `Refunded`.
  Dedupe keys are `invoice_id` + `status` for exactly this reason.

There is no public endpoint listing a commerce's invoices, so every invoice id
is persisted at creation time. An id lost there is lost permanently.
