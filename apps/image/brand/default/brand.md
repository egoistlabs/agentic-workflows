# Default brand

Used when a project has no brand pack of its own. A project pack only needs the tokens it wants to change; the rest come from here (`agentic-image brand check` shows which).

- **Voice:** plain, direct, second person. Short sentences. No hype words.
- **Claim limits:** state only what the human gives you. No numbers, results or testimonials unless they supply them.
- **CTA:** ask the human for the exact wording.

## Image style

None approved. Don't generate photos or illustrations with this pack. Use the human's own files, or layouts without images.

A project pack that allows generated images has an **Image style** section the human approves once: subjects and settings, lighting and mood, colour grading toward the token palette, composition that leaves room for text, and what to avoid.

## Tokens

Sizes are in pixels on a 1080 px wide slide, which a phone shows at about a third of that.

- **Colour:** `bg`, `fg`, `accent`, `accentGlow`, `muted`. `surface` (cards) and `line` (borders, dividers) are mixed from `fg` and `bg`, and `accentFg` (text on the accent) is `bg`, so they follow any pack's colours. A pack can set them outright.
- **Font:** `font` is the family, `fontFile` its file in the pack's `assets/`. A pack that sets `font` must also set `fontFile`. The default font is Geist (SIL Open Font License 1.1, `assets/OFL.txt`).
- **Type scale:** `typeDisplay` 120 (one big line), `typeTitle` 80 (cover hook), `typeHeading` 56, `typeBody` 40, `typeSmall` 32 (labels, sources). `typeMin` 28 is the floor: about 10 px on a phone, the smallest that stays readable. No text goes below it. `weightBody`, `weightStrong`, `leadingTight`, `leadingBody`, `trackingTight` finish the type.
- **Spacing:** `space1`–`space6`: 8, 16, 24, 40, 64, 96.
- **Radius:** `radiusSm` 12, `radiusMd` 24, `radiusLg` 40.
- **Safe margins:** `safeX`, `safeY` 80. No text inside them.
