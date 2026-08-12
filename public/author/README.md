# Author photo

Drop a headshot here and point `AUTHOR.photo` in `src/lib/author.ts` at it:

```ts
photo: "/author/camilosaka.jpeg" as string | undefined,
```

## What to supply

- **Square**, 400×400 or larger. It renders as a 56px circle, so anything
  wider gets cropped to the centre.
- Face clearly visible and reasonably lit. The point of the photo is that a
  stranger being asked for money can see who is asking.
- JPG or PNG. Keep it under ~200 KB.

Left unset, the signature renders your initials instead — a deliberate
fallback, so nothing ever appears broken.
