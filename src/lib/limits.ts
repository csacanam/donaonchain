/**
 * Limits shared between the form, the API and the certificate renderer.
 *
 * Kept in their own module rather than in `config.ts` so the donation form can
 * import them without dragging the Redis client into the browser bundle.
 */

/**
 * Longest donor name accepted, in characters.
 *
 * Set by the tightest consumer, the certificate: its name box holds two lines,
 * and a third spills past the dashed frame onto the artwork's printed text.
 *
 * The value is measured, not estimated. A first guess of 56 assumed ~30
 * characters per line; rendered through the preview endpoint it produced three
 * lines and overflowed, because word wrapping leaves ragged space that a
 * character count does not predict. 41 characters of realistic text set two
 * comfortable lines, so this sits just under that.
 *
 * Enforced in two places on purpose:
 *  - the input's `maxLength`, so the donor sees the limit while typing rather
 *    than having their name silently cut afterwards;
 *  - the API, because a client-side limit is a courtesy, not a guarantee.
 *
 * The two previously disagreed — the API stored 120 while the certificate cut
 * at 56 — so a long name showed in full in the public ledger and arrived
 * truncated on the donor's own certificate.
 */
export const MAX_DONOR_NAME = 40;
