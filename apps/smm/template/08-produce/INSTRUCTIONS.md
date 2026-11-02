# 08 Produce

Send each piece to its producer and collect the finished files, batch by batch in calendar order (`07-calendar/calendar.md`).

**The producer contract** (`docs/producer-contract.md` in the agentic-workflows repo). The planner and the producers only exchange files; neither calls the other's code.

1. For each piece, make `08-produce/<piece>/` with:
   - `brief.md`: the piece's brief, hooks, proof/visual notes, CTA and caption, copied from its `06-pieces/` file.
   - `piece.json`: `{ "piece", "plan", "format", "date", "slot", "brief": "brief.md", "reportTo": "<absolute path of this folder>" }`. `reportTo` is the folder the producer writes back to.
2. Print the producer's start command from the format's manifest (`agentic-smm formats show <format>`, `producer`): e.g. `agentic-video new <piece> --from <folder>/brief.md` for reels, or "make this in Canva" for formats made by hand. Give the human the batch checklist from `07-calendar/`.
3. When a piece is finished, the producer writes `asset.json` into that folder, listing the finished files. For pieces the human makes by hand, write it for them with the files they give you.
4. Check the files against the format's `files` and `limits`: count, extension, aspect ratio, and for reels duration within ±20% of the target with audio present. A piece that fails goes back to its producer.

`agentic-smm export`, `asset add <piece> <files…>`, `check --asset` and the ledger arrive in build step 3, as does agentic-video's `--from`. Until then do steps 1–4 by hand, and start a reel with `agentic-video new <piece> --format talking-head`, giving it `brief.md`.

Never make a video or image yourself. A text piece needs no files: its approved draft is the post.

When the pieces of the next batch to post all pass, set `stage:` to the next stage and log one line.
