# Logos

Drop a logo file here, then in `src/lib/orgs.ts` set the org's `logo` path and
its `logoBackground`:

```ts
logo: "/logos/peewah.png",
logoBackground: "light",   // or "none"
inkRatio: 1,               // see below
```

## `inkRatio` — why logos need it

Designers pad their canvases by wildly different amounts. Among the files here
the mark fills 100% of the file's height for Peewah, 72% for HashProof and 65%
for Voulti. Render them all at one container height and they come out at
different optical sizes — which reads as one partner being given more
prominence than the others, not as a layout bug.

So the row divides a target ink height by this number. Measure it once when
adding a logo: the height of the alpha channel's bounding box divided by the
file height. Omit it and the file is assumed to be untrimmed (`1`).

## Choosing `logoBackground`

This site is dark, so a logo's own colours decide how it must be placed:

- **`"light"`** — the mark is black or dark. It sits on a white chip, which is
  the only way it is visible here at all. (Peewah is this case.)
- **`"none"`** — the mark is white or light. It sits directly on the page. A
  chip around one of these is the thing that would look broken.

Get this wrong and the logo disappears entirely, which is why it is declared
per logo rather than guessed.

## What makes a usable file

- **SVG preferred**, or PNG at 2x with a genuinely transparent background.
- **The actual mark, not a picture of the mark.** A rendered scene — a sign on
  a wall, a mockup on a screen, a logo photographed in context — cannot be
  placed on a chip or on the page: its background is baked into the pixels, and
  it arrives as a square image among wordmarks. One such file was supplied for
  Voulti and set aside for this reason.
- Landscape, roughly 3:1 to 5:1. Tiles cap the height at 24px and let width
  follow.

Without a file, the wall renders a typographic wordmark instead — a deliberate
fallback, so nothing ever appears broken.
