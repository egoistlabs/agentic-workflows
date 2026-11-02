# 06 Pieces

Write one file per piece in `05-series/series.md` and the fast lane: `<series>-<nn>-<short-title>.md` here (fast lane: `fast-<nn>-<short-title>.md`). Copy `piece-template.md` and fill every field. The `brief` field is the format's brief template: `agentic-smm formats show <format>`.

Rules:

- **One idea per piece.** If a beat or slide says "and also", it becomes another piece.
- **True stories only.** Every number and result matches a `public` entry in `<brand>/story-bank.md`. `soft` stories are told without numbers; `private` ones are never used. List each claim and its story id in `risk check`.
- **Hooks:** 5–10 variants in the audience's words (`02-audience/audience.md`), top 3 marked. Keep the rest for re-posts and A/B tests.
- **Reels:** beats are prompts to talk through, never sentences to read out. Only the `must-say` lines (at most 2: the hook and any real number) are exact.
- **Slide text, image text, captions and text posts** are drafts in the voice of `<brand>/brand.md`. The human edits them.
- **Limits:** the format's limits (`formats show <format>`): words per beat, slide or image, caption length, size.
- **Offer pitches:** at most 1 in 4 pieces.
- **No repeats too soon:** a hook pattern waits 14 days and a main story 30 days, based on the repo's `content/used.md`. A deliberate repurpose of a winner is exempt.

`agentic-smm check <slug>` arrives in build step 2; until then check each rule by hand and fix what fails.

Write `pieces.md`: one row per piece (file, series, no., format, working title, top hook, CTA, size), then any rule you could not meet and why.

CHECKPOINT: show the human `pieces.md` and the piece files, and stop. After approval, add `approved: yes` to `pieces.md`, log their words in STATUS.md, and set the next stage.
