"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PHOTOS } from "@/lib/photos";
import type { Lang } from "@/lib/content";

/**
 * The author's own photographs, set inside the letter.
 *
 * One lead image at full column width, the rest as a quiet grid. Tapping any
 * of them opens it large, because on a phone the detail in these frames — the
 * crushed car, the exposed shop floor — is invisible at thumbnail size.
 *
 * Presented plainly: no captions over the images, no filters, no motion. They
 * are documents, and dressing them up would be the wrong instinct on a page
 * about people who died.
 */
export function Photos({ lang, credit }: { lang: Lang; credit: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex !== null ? PHOTOS[openIndex] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => ((i ?? 0) + 1) % PHOTOS.length);
      if (e.key === "ArrowLeft")
        setOpenIndex((i) => ((i ?? 0) - 1 + PHOTOS.length) % PHOTOS.length);
    };
    window.addEventListener("keydown", onKey);
    // Stop the letter scrolling behind the open image.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <figure className="my-8">
      {/* A uniform contact sheet rather than one hero image. These are
          portrait frames: at full column width a single one runs ~900px tall
          and swallows the letter it is supposed to support. Six equal tiles
          say "I took these" more plainly, and cost half the height. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PHOTOS.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="overflow-hidden rounded-lg border border-line transition-opacity hover:opacity-80"
            aria-label={photo.alt[lang]}
          >
            <Image
              src={photo.src}
              alt={photo.alt[lang]}
              width={photo.width}
              height={photo.height}
              priority={i < 3}
              // Measured on a 1280px window: the first row of tiles starts
              // 597px down a 786px viewport, so it is on screen at load and
              // the first three are worth preloading.
              //
              // The desktop figure is 190px against tiles that measure 201px.
              // Under-declaring by 11px is deliberate: at 201px and DPR 2 the
              // browser asks for 402px and rounds up to the 640px candidate,
              // which is 120 KB of rubble texture per tile. Declaring 190
              // lands it on 384px — 1.9x instead of 2x on a thumbnail, which
              // is invisible, for well under half the bytes.
              sizes="(max-width: 640px) 50vw, 190px"
              // See next.config.ts: 50 is for these thumbnails only.
              quality={50}
              className="aspect-[3/4] h-auto w-full object-cover"
            />
          </button>
        ))}
      </div>

      <figcaption className="mt-3 text-sm text-faint">{credit}</figcaption>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.alt[lang]}
          onClick={() => setOpenIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 sm:p-8"
        >
          {/* `fill` inside a sized box rather than intrinsic width/height:
              next/image writes its own width and height styles, which beat
              utility classes and left the image rendering at full 1600px and
              effectively invisible inside the overlay. */}
          <div className="relative h-full w-full">
            <Image
              src={open.src}
              alt={open.alt[lang]}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface text-xl leading-none text-muted hover:text-fg"
          >
            ×
          </button>
        </div>
      )}
    </figure>
  );
}
