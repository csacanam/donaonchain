"use client";

import { Fragment, type ReactNode } from "react";
import { INLINE_LINKS } from "@/lib/orgs";

/**
 * Renders copy with known organisation names turned into links.
 *
 * Done here rather than by writing anchors into the copy strings, because the
 * names appear in a dozen places across two languages — the letter, the flow
 * steps, the FAQ, the thank-you page — and a reader who wants to check who is
 * holding the money should be one tap away wherever they happen to read it,
 * not only where someone remembered to add a link.
 *
 * Keeps the copy in `content.ts` as plain text: no markup to escape, and
 * translators never have to preserve a tag.
 */

/**
 * One alternation over all names, longest first.
 *
 * Order matters: "ReFi DAO" would otherwise match inside a sentence before
 * "ReFi Colombia" got the chance, and a regex alternation takes the first
 * branch that matches at a position, not the longest.
 */
const PATTERN = new RegExp(
  `(${[...INLINE_LINKS]
    .sort((a, b) => b.name.length - a.name.length)
    .map((l) => l.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})`,
  "g",
);

const URL_BY_NAME = new Map(INLINE_LINKS.map((l) => [l.name, l.url]));

export function LinkedText({ children }: { children: string }): ReactNode {
  const parts = children.split(PATTERN);
  if (parts.length === 1) return children;

  return parts.map((part, i) => {
    const url = URL_BY_NAME.get(part);
    if (!url) return <Fragment key={i}>{part}</Fragment>;

    return (
      <a
        key={i}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        /* Styled like every other link on the page. An earlier version muted
           these to avoid speckling the letter, and the result was that nobody
           could tell they were clickable at all — which defeats the point of
           linking them. */
        className="text-accent underline decoration-accent-dim/60 underline-offset-4 transition-colors hover:decoration-accent"
      >
        {part}
      </a>
    );
  });
}
