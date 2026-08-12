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
      <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-4">
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
              <span
                className={
                  org.logoBackground === "light"
                    ? "flex items-center rounded-md bg-white px-3 py-2"
                    : "flex items-center"
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
              <span className="text-base font-semibold tracking-tight text-muted transition-colors group-hover:text-accent">
                {org.name}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
