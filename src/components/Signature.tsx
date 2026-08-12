"use client";

import { useState } from "react";
import Image from "next/image";
import { AUTHOR, initials, type AuthorLink } from "@/lib/author";
import type { Lang } from "@/lib/content";

/** Brand glyphs, inlined so the signature costs no extra network request. */
const ICONS: Record<AuthorLink["icon"] | "email", React.ReactNode> = {
  email: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2.5 6.5l9.5 7 9.5-7" />
    </>
  ),
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  x: (
    <path
      d="M3 3l7.5 9.8L3.4 21H6l5.7-6.6L16.6 21H21l-7.9-10.3L20.6 3H18l-5.2 6L8.3 3H3z"
      fill="currentColor"
      stroke="none"
    />
  ),
  linkedin: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <path d="M7 10v7M7 7v.01M11.5 17v-4a2.5 2.5 0 015 0v4" />
    </>
  ),
};

/**
 * Letter sign-off: photo, full name, role, and public profiles.
 *
 * The photo degrades to initials rather than to a broken image — an empty
 * frame under a request for money reads as neglect.
 */
export function Signature({ lang }: { lang: Lang }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(AUTHOR.photo) && !photoFailed;

  return (
    /* No rule above it and no card around it: this is the sign-off of the
       letter, and any divider would turn it back into an "about the author"
       block, which is precisely what it must not be. */
    <div className="mt-8 flex flex-wrap items-center gap-4">
      {showPhoto ? (
        <Image
          src={AUTHOR.photo!}
          alt={AUTHOR.name}
          width={56}
          height={56}
          onError={() => setPhotoFailed(true)}
          className="h-14 w-14 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-sm font-semibold tracking-wide text-muted"
        >
          {initials(AUTHOR.name)}
        </span>
      )}

      <div className="min-w-0">
        {/* The one handwritten element on the page. It is a typographic cue
            that this is a letter, not a reproduction of anyone's real hand. */}
        <p className="signed text-fg">{AUTHOR.name}</p>
        <p className="mt-1.5 text-sm text-muted">{AUTHOR.role[lang]}</p>
      </div>

      <div className="flex items-center gap-1.5 sm:ml-auto">
        {/* Email sits with the social links so there is always a way to reach
            a person from the letter itself, not only from the footer. */}
        {[...AUTHOR.links, { label: AUTHOR.email, url: `mailto:${AUTHOR.email}`, icon: "email" as const }].map((link) => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="me noopener noreferrer"
            aria-label={link.label}
            title={link.label}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-accent-dim hover:text-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {ICONS[link.icon]}
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
