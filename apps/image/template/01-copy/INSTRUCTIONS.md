# 01 Copy

Write `copy.md`: the exact words that will appear, slide by slide, and the caption. Nothing is designed or rendered until the human approves it.

**Slide table.** One row per slide, in posting order:

| # | Copy | What it does |
| --- | --- | --- |
| 1 | **Title:** … <br>**Body:** … | Cover: the hook; states the promise and works alone in a grid |
| 2 | **Title:** … <br>**Body:** … | One point: … |
| n | **Title:** … <br>**CTA:** … | Closing: the takeaway and the one CTA |

- **Copy** is the exact text, field by field (title, body, items, label, source…), with the capitalization it will have on the slide. **What it does** is the slide's job in a few words; it never appears on the slide.
- Stay within the brief's word limits; write each slide's word count after the table. One point per slide. Cut any line the reader could predict.
- Check every number and claim against the brief's claim limits. Never label invented UI or examples "example" or "illustrative" on a slide; keep them generic (no real company or person), with numbers only from the brief or the creator's story bank (their own true stories and figures, kept in `brand/story-bank.md` when agentic-smm is used).
- An image: one row, the headline plus at most one supporting line.

**Caption.** Under `## Caption`, the exact post caption: the hook line, the value, the CTA. Under 150 words for a single image.

**Generated images.** Under `## Generated images`, list the slides the brief says get one, or "none". Approving the copy also approves generating these for this job.

CHECKPOINT: show the human `copy.md` and stop. After they approve, add a line `approved: yes` to `copy.md`, log their words in STATUS.md, and set the next stage.

**Approved copy stays exact:** wording, capitalization and slide order. If any of it has to change later (a line shortened to fit a layout, a slide moved), set `stage: 01-copy`, remove `approved: yes`, show the human only what changed, and get a new approval before it goes into a visual.
