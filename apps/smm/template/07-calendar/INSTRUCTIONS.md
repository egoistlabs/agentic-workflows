# 07 Calendar

Put every approved piece (`06-pieces/pieces.md`) on a date and slot, and group them into production batches. `agentic-smm calendar <slug> [--start <date>]` arrives in build step 3; until then lay it out by hand.

Rules:

- Follow the brief's format mix, within 1 piece per week.
- No more than 2 pieces in a row from the same series or of the same format, unless the brief asks for it.
- Post in the brief's slots. Once a format has 20 posts, suggest its best slots from the repo's `content/baseline.json`.
- **Fast lane:** keep at least 1 open slot per week for timely pieces. A timely piece goes out before its expiry and may push a series piece back by one slot.
- **Batches** per producer, sized by each format's `batch` in its manifest and the brief's load limit: 3–5 reels per shoot day, 2–4 carousels or 4–6 images per design batch. Schedule each batch early enough for its pieces' dates.

Write `calendar.md`: one row per slot (date, time, piece file, series, format, batch; fast-lane slots marked `open`), then the batches with their dates. Write one checklist per batch, `batch-<n>.md`, one page: for a shoot day, the beat names large enough to read off a phone, piece by piece; for a design batch, the slide headlines in order.

CHECKPOINT: show the human `calendar.md` and the batch checklists, and stop. After approval, add `approved: yes` to `calendar.md`, log their words in STATUS.md, and set the next stage.
