/**
 * Who signs the letter.
 *
 * The signature is doing real work here, not decoration. The first objection a
 * crypto reader brings to a donation page is that it might be a scam, and a
 * real name attached to public profiles anyone can open is the cheapest,
 * strongest answer available. A pseudonymous appeal for money gets scrolled
 * past.
 */

export type AuthorLink = {
  label: string;
  url: string;
  /** Icon key rendered by the Signature component. */
  icon: "instagram" | "x" | "linkedin";
};

export const AUTHOR = {
  name: "Camilo Sacanamboy",
  role: {
    en: "Colombian onchain builder",
    es: "Builder onchain colombiano",
  },
  /**
   * Optional headshot. Drop a square image (400×400 or larger, face clearly
   * visible) into /public/author/ and set this to its path, e.g.
   * "/author/camilosaka.jpeg".
   *
   * Left undefined on purpose while no file exists: pointing at a missing
   * asset costs a 404 on every page load. Undefined instead falls back to
   * initials, which is a designed state rather than a broken image.
   */
  photo: "/author/camilosaka.jpeg" as string | undefined,
  /** Reachable inbox. peewah.co has MX; donaonchain.com does not. */
  email: "camilo@peewah.co",
  /** The author's own first-hand account of the day, linked from the letter. */
  thread: "https://x.com/camilosaka/status/2086852528180711857",
  links: [
    { label: "Instagram", url: "https://instagram.com/camilosaka", icon: "instagram" },
    { label: "X", url: "https://x.com/camilosaka", icon: "x" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/camilosaka", icon: "linkedin" },
  ] satisfies AuthorLink[],
} as const;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
