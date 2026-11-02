# 02 Layout

Write `deck.json`: one entry per slide of the approved copy, in the same order. The renderer reads only this file; agents edit it, never shared code.

```json
{
  "slides": [
    {
      "layout": "cover",
      "fields": { "kicker": "…", "title": "…", "body": "…" },
      "image": { "src": "images/desk.jpg", "crop": "cover", "position": "50% 30%", "alt": "…" }
    },
    { "layout": "note", "fields": { "label": "…", "title": "…", "quote": "…", "body": "…" } },
    { "layout": "checklist", "fields": { "title": "…", "items": ["…", "…", "…"], "tail": "…" } },
    { "layout": "closing", "fields": { "title": "…", "body": "…", "cta": "…" } }
  ]
}
```

- **A slide** has exactly these keys: `layout` (required), `fields` (required), `image` (optional). Any other key is an error.
- **Fields** hold the approved copy exactly, character for character, as text (`"…"`) or, for a list field, a list of text entries (`["…", "…"]`). A newline (`\n`) in a field is a line break on the slide. Leave out an optional field rather than setting it to `""`. If a line doesn't fit a layout, don't edit it here: go back to `01-copy` (see its instructions).
- **Layouts:** pick the one that fits each slide's job. Each layout's `layout.json` lists its fields, which are required, and its limits: `maxWords` per field (per entry for a list), and `min`/`max` entries for a list. Shared layouts live in the tool's `layouts/` (path printed by `route`):

  | Layout | Fields (required in bold) | Image |
  | --- | --- | --- |
  | `cover` | `kicker` (8 words), **`title`** (12, the hook), `body` (18), `footer` (6) | optional |
  | `note` | `label` (4), **`title`** (14), `quote` (24, dialogue: a spoken line set as a speech bubble), `body` (26) | none |
  | `checklist` | **`title`** (10), **`items`** (3–6 entries, 10 words each), `tail` (14) | none |
  | `closing` | `label` (4), **`title`** (16, the takeaway), `body` (20), **`cta`** (12), `footer` (6) | none |
  | `native` | `kicker` (6), **`title`** (14), `body` (20), and one native UI card: `app` (4), `cardTitle` (12), `cardMeta` (10), `pill` (3, the card's state and the slide's only accent) | none |

  `statement`, `stat`, `quote`, `before-after`, `screenshot` and `steps` arrive in build step 4. Words are counted as runs of text with a letter or digit, so dashes and emoji don't count. Body slides show their position (`2/6`) in the top corner.
- **The cover works alone:** on Facebook a carousel shows as a grid, so the cover's title must make sense without the other slides.
- **Local layouts:** if no layout fits, add one for this job only in `02-layout/layouts/<name>/` (lowercase letters, digits and hyphens), with three files:
  - `layout.json`: `{"use": "…", "fields": {"title": {"type": "text", "required": true, "maxWords": 12}, "items": {"type": "list", "min": 3, "max": 6, "maxWords": 10}}, "image": "none" | "optional" | "required"}`.
  - `layout.html`: the slide's inside. `{{title}}` inserts a field (escaped); `{{#body}}…{{/body}}` shows a part only when the field is set; `{{^body}}…{{/body}}` only when it isn't; `{{#items}}<li>{{.}}</li>{{/items}}` repeats per entry (`{{@nn}}` is its number, 01, 02…); `{{#image}}<img src="{{url}}" alt="{{alt}}" style="{{style}}">{{/image}}` places the image with its crop and position; `{{slide.n}}/{{slide.count}}` is the slide's position. Wrap text in `<div class="safe">…</div>` to keep it inside the safe margins.
  - `layout.css`: scoped to `.layout-<name>`, reading only the brand's token properties (`var(--bg)`, `var(--typeBody)`, `var(--space4)`…): no colour, font, px size or radius of its own. The renderer refuses a colour that isn't a token and any property no token sets.

  A job's layout is used before a shared one of the same name. It moves into the shared `layouts/` only when the human asks, after it has been used in more than one job.
- **Images:** only on layouts that take one (`cover`). `src` is `images/<file>` (put files in `02-layout/images/`) or `brand:<file>` for a file in the brand's `assets/`; `.png`, `.jpg`, `.jpeg` or `.webp`. `crop` is `cover` (fill the frame, trim the overflow; the default) or `contain` (show it whole). `position` is the focal point as `x% y%`, each 0–100 (default `50% 50%`); keep faces and the subject clear of the text. `alt` says what it shows.
- **Generated images:** only for the slides `copy.md` lists under **Generated images**, and only from the **Image style** section of the brand's `brand.md`: build each prompt from that section plus what the slide needs. Never text, letters or logos in the image, never the creator's likeness or any real person, and never a generated person presented as a real learner, customer or testimonial. A generated image moves into the brand's `assets/` for reuse only when the human asks. Save each with its prompt, provider and date (`images/<name>.json`). Generation arrives in build step 6; until then, stop and tell the human, and use their own photos or a layout without one.
- Real photos of the creator come only from the brand's `assets/` or files the human supplies.

`agentic-image preview <slug>` serves the deck locally and shows any deck error; it reloads as you edit. `agentic-image render <slug>` checks `deck.json` against the layouts before it renders, and lists every problem with its slide.

Set `stage:` to the next stage and log one line.
