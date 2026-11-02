# 04 Deliver

Write the final files from the approved version only (`approved version:` in `03-render/visuals.md`).

1. `agentic-image deliver <slug>` writes into this folder:
   - `01.png`, `02.png`… the approved version's slides, numbered in posting order.
   - `caption.md`: the exact approved caption from `01-copy/copy.md`.
   - `asset.json`: the files, their pixel sizes, the version, and the approval record (who approved copy and visuals, when, in their words).

   It arrives in build step 3. Until then, stop and tell the human delivery isn't built yet; don't copy or rename files by hand.
2. Check that the PNGs are the approved version's, in order, and the caption matches `copy.md` exactly.
3. Set `stage: done` and log one line. Offer `agentic-image publish <slug>`, which copies the PNGs and caption to the creator's repo (default `images/<slug>/`). It arrives in build step 3; until then, tell the human where the files are.
