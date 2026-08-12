/**
 * Organisations shown on the site.
 *
 * `RECIPIENT` is the one organisation that receives and distributes the money.
 * `SUPPORTERS` is the row shown near the foot of the page, in the order they
 * appear here.
 *
 * Every entry carries `confirmed`, and anything false is not rendered at all.
 * Flipping one to true is a statement that the organisation agreed to appear —
 * a logo on a page that asks strangers for money reads as an endorsement,
 * whether or not that is what was intended.
 */

export type Org = {
  key: string;
  name: string;
  url: string;
  /** Set true only when the organisation has agreed to appear. */
  confirmed: boolean;

  /**
   * Path to a logo under /public/logos. Omit it and the row renders a
   * typographic wordmark instead — deliberate, so a missing asset is never a
   * broken image on a page asking people for money.
   */
  logo?: string;

  /**
   * How the logo sits on this site's dark background.
   *
   * `"light"` puts the mark on a white chip, which is the only way a
   * black-on-transparent logo is visible here at all. `"none"` (the default)
   * places it directly on the page, correct for marks drawn in white or other
   * light colours. Guessing this wrong makes a partner's logo vanish, so it is
   * declared per logo.
   */
  logoBackground?: "light" | "none";

  /**
   * Height of the LETTERING as a fraction of the file's height, 0–1.
   *
   * Not the bounding box. Logo lockups set their wordmark at very different
   * sizes relative to their icon: measured from these files, the letters are
   * 69% of the mark's height for Voulti, 50% for Peewah and just 34% for
   * HashProof, whose tall shield dwarfs its text. Sizing by the bounding box
   * therefore renders HashProof's name at half the size of the others — which
   * is what made it look shrunken even after the files were trimmed.
   *
   * The row divides a target lettering height by this number, so the words
   * read at the same size. Measure it by taking the tallest ink column in the
   * right-hand (wordmark) portion of the file, over the file height.
   */
  wordmarkRatio?: number;

  /** One or two words. This is a logo row, not a description. */
  role: { en: string; es: string };
};

/**
 * Names that become links wherever they appear in body copy.
 *
 * Longest first: "ReFi Colombia" has to be matched before "ReFi DAO" would
 * otherwise chew into it, and both before any bare "ReFi".
 */
export const INLINE_LINKS: { name: string; url: string }[] = [
  { name: "ReFi Colombia", url: "https://www.instagram.com/reficolombia" },
  { name: "ReFi DAO", url: "https://refidao.com" },
];

/** The organisation that receives and distributes the funds. */
export const RECIPIENT: Org = {
  key: "reficolombia",
  name: "ReFi Colombia",
  url: "https://www.instagram.com/reficolombia",
  confirmed: true,
  role: { en: "Receives & distributes", es: "Recibe y distribuye" },
};

/**
 * The support row, in display order.
 *
 * Order is deliberate and set by the organiser: the people who built and run
 * the campaign first, then the organisation holding the money, then the
 * ecosystem and the tools it runs on.
 */
export const SUPPORTERS: Org[] = [
  {
    key: "peewah",
    name: "Peewah",
    url: "https://peewah.co",
    confirmed: true,
    // Black wordmark on transparency — invisible here without the chip.
    logo: "/logos/peewah.png",
    logoBackground: "light",
    wordmarkRatio: 0.5,
    role: { en: "Built this site", es: "Construyó este sitio" },
  },
  {
    ...RECIPIENT,
    // Recovered from the supplied file rather than used directly. The
    // original — still at /logos/reficolombia.png — is 540x540, fully opaque,
    // and drawn a hair off its own white background: every pixel sits between
    // luminance 224 and 255, so on this page it rendered as a blank pale
    // square. The lettering is real, just barely separated from the canvas, so
    // the background was keyed out at that boundary and the wide margins
    // cropped away. A proper transparent export from ReFi Colombia should
    // replace this.
    logo: "/logos/reficolombia-transparent.png",
    logoBackground: "none",
    // Stacked lockup, not a single-line wordmark: "ReFi" is 179px of the
    // 234px crop and "COLOMBIA" the remaining band. Sized so the whole
    // lockup lands near the other marks' overall height rather than setting
    // its top line to their lettering height, which would leave the second
    // line an illegible smear.
    wordmarkRatio: 0.45,
    role: { en: "Receives the donations", es: "Recibe las donaciones" },
  },
  {
    key: "celo",
    name: "Celo",
    url: "https://celo.org",
    confirmed: true,
    // Black logotype on transparency — invisible on this background without
    // the chip. The glyphs run edge to edge with no padding, so by the file
    // this would be 1; it is set lower because Celo's logotype is wide and
    // thin, and at the same measured height it reads smaller than the others.
    // Tuned against the rendered row, not computed.
    logo: "/logos/celo.png",
    logoBackground: "light",
    wordmarkRatio: 0.82,
    role: { en: "Ecosystem", es: "Ecosistema" },
  },
  {
    key: "voulti",
    name: "Voulti",
    url: "https://voulti.com",
    confirmed: true,
    // Green icon with a black wordmark — needs the chip.
    logo: "/logos/voulti.png",
    logoBackground: "light",
    wordmarkRatio: 0.69,
    role: { en: "Payments", es: "Pagos" },
  },
  {
    key: "hashproof",
    name: "HashProof",
    url: "https://hashproof.dev",
    confirmed: true,
    // "Hash" is drawn in white and "Proof" in blue: built for dark backgrounds,
    // so a chip would be the thing that looked wrong here.
    logo: "/logos/hashproof.png",
    logoBackground: "none",
    wordmarkRatio: 0.34,
    role: { en: "Certificates", es: "Certificados" },
  },
];

export function visible(orgs: Org[]): Org[] {
  return orgs.filter((o) => o.confirmed);
}
