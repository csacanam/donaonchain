/**
 * Names for the addresses this campaign's money actually passes through.
 *
 * The movements table used to show a direction, an amount and a link, and
 * nothing about the other side of the transfer. A donor watching ~$30 leave
 * the published wallet saw only that it left. An unexplained outflow on a
 * donation page is worse than no table at all: it invites the worst reading
 * and gives nothing to check it against.
 *
 * Only addresses we can actually vouch for belong here. Anything unknown
 * stays a truncated hex string linked to the explorer — an honest "we do not
 * know who this is" rather than a label someone might read as an endorsement.
 */
export type AddressLabel = { en: string; es: string };

export const KNOWN_ADDRESSES: Record<string, AddressLabel> = {
  // Where every payment lands first. Shared by every merchant Voulti serves on
  // that chain, so its balance says nothing about this campaign — see the
  // custody section of the README.
  "0xcdbbc0db75bce387bdc9ea2248c5f92b1f8d88c1": {
    en: "Voulti settlement contract",
    es: "Contrato de liquidación de Voulti",
  },

  // Where ReFi Colombia sweeps the donations after withdrawing them. It is a
  // Safe, and deliberately NOT described as a multi-signature one: it is
  // configured 1-of-1, so a single key moves everything. Change this label the
  // day the threshold changes, not before.
  "0x8c5f869e1a5a39f378612d69c32e84d0114ab7c5": {
    en: "ReFi Colombia treasury",
    es: "Tesorería de ReFi Colombia",
  },
};

export function labelFor(address: string, lang: "en" | "es"): string | null {
  return KNOWN_ADDRESSES[address.toLowerCase()]?.[lang] ?? null;
}

/** `0x1234…cdef` — enough to compare against an explorer at a glance. */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Turns a transaction link into an address link on the same explorer.
 *
 * Derived from the tx URL rather than looked up by chain, because a movement
 * already carries the one and the chain key never reaches the component.
 */
export function addressUrlFrom(txUrl: string, address: string): string | null {
  const i = txUrl.indexOf("/tx/");
  return i === -1 ? null : `${txUrl.slice(0, i)}/address/${address}`;
}
