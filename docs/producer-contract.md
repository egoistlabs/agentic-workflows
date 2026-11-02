# Producer contract

agentic-smm plans a piece; a **producer** makes it. agentic-video makes reels, agentic-image makes carousels and single images, and the human makes anything else by hand. The planner and its producers only exchange files. Neither calls the other's code, so any tool that reads `brief.md` and writes `asset.json` can be a producer.

agentic-smm owns this contract. Change it here first, then in the apps.

```
agentic-smm  ──brief.md + piece.json──►  producer  ──asset.json + files──►  agentic-smm
(plans the piece)                         (makes it)                         (schedules it)
```

## The flow

1. **The planner writes a hand-off folder.** In its `08-produce` stage, agentic-smm makes `.plans/<plan>/08-produce/<piece>/` for each piece, with `brief.md` and `piece.json`, and prints the producer's start command from the format's manifest (`formats/<format>/format.json`, `producer`).
2. **The producer starts from the brief.** For example `agentic-video new <piece> --from <folder>/brief.md`, or `agentic-image new <piece> --from <folder>/brief.md`. The brief fills the producer's own `00-brief`.
3. **The producer reports back.** When the human approves the finished piece in the producer's final stage, the producer writes `asset.json` into the folder named by `reportTo`. For a piece the human makes by hand, the planner writes `asset.json` from the files they give it.
4. **The planner checks the files** against the format's `files` and `limits` (count, extension, aspect ratio; for reels, duration within ±20% of the target and audio present). A passing piece is ready to schedule; a failing one goes back to its producer.

## `brief.md`

The piece's brief, copied from its `06-pieces/` file: the format's brief (beat sheet, slide outline, image text or draft), the hooks, proof and visual notes, the CTA and the caption. Each format's brief template is `formats/<format>/brief.md` in agentic-smm.

## `piece.json`

```json
{
  "piece": "<piece id>",
  "plan": "<plan slug>",
  "format": "reel | carousel | image | text",
  "date": "<YYYY-MM-DD>",
  "slot": "<HH:MM and timezone>",
  "brief": "brief.md",
  "reportTo": "<absolute path of this hand-off folder>"
}
```

**Approved copy.** When a piece was approved in agentic-smm, its slide text and caption count as approved copy in the producer. The producer's copy stage only shows what changed (for example, a line shortened to fit), and each change needs the human's approval.

## `asset.json`

Written into `reportTo` by the producer (or by the planner, for hand-made pieces). It lists the finished files and records the approval:

| Field | Holds |
| --- | --- |
| `piece` | The piece id from `piece.json` |
| `producer` | The tool that made it (`agentic-video`, `agentic-image`, `manual`) |
| `files` | The finished files in posting order, each with its path and pixel size (and duration for video) |
| `version` | The approved version, if the producer keeps versions |
| `approval` | Who approved, when, and their words |

What each producer delivers:

| Producer | Files |
| --- | --- |
| agentic-video | The final `.mp4` (9:16, captions burned in) and the post caption draft |
| agentic-image | `01.png`, `02.png`… of the approved version in posting order, and `caption.md` with the exact approved caption |
| manual | Whatever the format's `files` asks for; nothing for a text post, whose approved draft is the post |

## Status

The hand-off is not automated yet. agentic-smm's `export`, `asset add` and `check --asset` arrive in its build step 3, agentic-video's `--from` with that same step, and agentic-image's `--from` and `asset.json` in its build step 5. Until then the agent does the steps above by hand, as `08-produce/INSTRUCTIONS.md` describes. The exact `asset.json` fields are settled when the first producer writes one.
