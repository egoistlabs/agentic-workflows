# 03 Render

Render a version, check it, and show the human the full set. Only the human approves visuals.

1. `agentic-image render <slug>` renders the next version into `03-render/v<n>/` (`01.png`, `02.png`… in posting order, plus `deck.json` and `render.json`, a record of what was rendered): v1 first, then v2, v3… Earlier versions are kept; never delete or overwrite one. It renders one slide at a time at low priority.
   - It refuses to run until `01-copy/copy.md` is approved, and refuses to export when a token is missing, the brand font didn't load or a character falls back to another font, or a slide's colours aren't the brand's tokens. The error names the slide and the element or property. Fix the deck or layout in `02-layout`; change the brand pack only when the human asks.
   - `agentic-image render <slug> --draft` renders into `03-render/draft/` without copy approval, replacing the last draft. A draft is never a version and is never shown for approval.
   - `agentic-image preview <slug>` serves the slides at a local URL for a live look, until Ctrl-C.
2. `agentic-image qa <slug> --version <n>` checks text inside the slide and safe margins, the real font and tokens, contrast of at least 4.5:1, no text under the type scale's minimum, word and item limits, and slide count, pixel size and file size. It arrives in build step 3; until then, look at every PNG at full size yourself for the same things and say so to the human. A fail sends you back to `02-layout`: fix it and render the next version.
3. Look at every slide yourself before showing it. Check the copy on each slide against the approved `copy.md`, character for character. For a Facebook carousel, check the cover alone and the first few slides side by side.
4. Write `visuals.md`: the version, the QA result, the slide files in order, and anything the human should look at closely.

CHECKPOINT: show the human the full ordered set of that version (every slide, not only the ones that changed) and stop.

- Their feedback becomes the next version. Log what they asked for, change `02-layout/deck.json`, and render again. A change to the words goes back to `01-copy` for a new copy approval first.
- **A version number isn't approval.** v3 existing, or being the latest, approves nothing. Copy approval doesn't approve the visuals either.
- Never mark visuals approved yourself, however clean the QA. Only when the human approves a specific version in this conversation, write `approved version: v<n>` and `approved: yes` in `visuals.md`, log their words in STATUS.md, and set the next stage.
