# 01 Collect

Blind stage: read `../00-brief/brief.md` and `../00b-sources/sources.md` only. Open nothing else in `../00-brief/`.

1. For rows whose fetcher is `manual` (G2, Discord, Skool, websearch, or X without a token), save items first. Use one `.md` file per item in `manual/<source>/`, with front matter `url` and `date`, followed by the verbatim text. Never paraphrase.
2. Run `agentic-research collect <study>`. It runs each row up to its quota, then stops. It writes `raw/<source>-<id>.md` with `source`, `row`, `url`, `date`, `score`, `phrase`, `voice`, and `audience_guess`, and it logs counts per source and per voice to STATUS.md.
3. Read its report. Any row marked `BLOCKED`, `NEEDS-CREDENTIALS`, `EMPTY`, or `ERROR` was not collected. Log each one in STATUS.md, with what it means for the sample (e.g. "Reddit blocked: no firsthand non-tech voice"). Never let a blocked source pass as empty.
4. Run `agentic-research select <study>`. It applies the budget and the secondhand cap, writes `selected/`, and logs the counts. Stage 02 reads only `selected/`.

Keep everything that was collected: praise, neutral posts, and off-topic posts included. Do not filter by whether an item supports anything.

Set `stage: 02-code`.
