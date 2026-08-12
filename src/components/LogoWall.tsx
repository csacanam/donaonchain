"use client";

import Image from "next/image";
import type { Lang } from "@/lib/content";
import type { Org } from "@/lib/orgs";

/**
 * A small row of technology logos, deliberately understated.
 *
 * These organisations supplied tools. They are not sponsors, endorsers, or
 * managers of the relief effort, and the layout should not let them read as
 * any of those — hence: bottom of the page, small, muted, and no descriptions
 * of what each one does.
 *
 * Renders the real logo when one exists and a typographic wordmark when it does
 * not. The fallback is a designed state, not a placeholder: a broken image on a
 * page that asks strangers for money reads as neglect.
 */
/** How tall the lettering should read, in px, for every logo in the row. */
const TARGET_TEXT_PX = 13;

export function LogoWall({
  orgs,
  lang,
  title,
}: {
  orgs: Org[];
  lang: Lang;
  title: string;
}) {
  if (orgs.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-faint">{title}</p>
      {/* gap-x-4 rather than the roomier 8. Measured: the five cells are
          547.7px against 624px of column, so 32px gaps overflowed by 35px and
          dropped HashProof alone onto a second line. 16px gaps total 611.7 and
          the row holds, with 12px to spare. It wraps rather than overflows, so
          a wider mark later only costs a line — worth re-measuring when ReFi
          Colombia's logo replaces their text. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-4">
        {orgs.map((org) => (
          <a
            key={org.key}
            href={org.url}
            target="_blank"
            rel="noopener noreferrer"
            title={org.role[lang]}
            className="group flex items-center"
          >
            {org.logo ? (
              /* A dark mark on a dark page is an invisible mark. Logos that
                 need it get a pale chip; ones drawn in white sit bare, since
                 a chip around those would be the thing that looks broken.
                 The chip stays fully opaque and the mark inside is what dims —
                 a translucent white chip just reads as grey and looks like a
                 rendering fault rather than a choice. */
              /* Every cell is the same height, chip or not. Sizing each one
                 to its own mark left the row visibly ragged — the marks are
                 different shapes, and a chip that hugs each one turns that
                 into uneven boxes. Fixed height, mark centred inside. */
              <span
                className={
                  org.logoBackground === "light"
                    ? "flex h-11 items-center rounded-md bg-white px-3"
                    : "flex h-11 items-center"
                }
              >
                <Image
                  src={org.logo}
                  alt={org.name}
                  width={240}
                  height={64}
                  // Height is derived from how much of the file the mark
                  // actually fills, so every logo lands at the same optical
                  // size regardless of how its designer padded the canvas.
                  style={{ height: `${TARGET_TEXT_PX / (org.wordmarkRatio ?? 0.5)}px` }}
                  className="w-auto object-contain opacity-75 transition-opacity group-hover:opacity-100"
                />
              </span>
            ) : (
              <span className="flex h-11 items-center text-base font-semibold tracking-tight text-muted transition-colors group-hover:text-accent">
                {org.name}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
