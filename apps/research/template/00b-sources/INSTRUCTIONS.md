# 00b Sources

Blind stage: read `../00-brief/brief.md` only. Open nothing else in `../00-brief/`.

Choose where the audience talks about itself, in its own words. Then find the phrases it uses.

1. **Candidates.** For each audience group in the brief, list 3–8 candidate sources. Start from `sources/registry.json` (match its `audiences` tags), then add specific targets: subreddits, Product Hunt posts, Trustpilot domains, YouTube queries, communities.
2. **Draft `sources.md`.** Fill the table with `access` set to `?`.
3. **Probe.** Run `agentic-research collect <study> --probe`. It sends one real request per row and writes `probe.md`. Copy each result into the `access` column: `ok`, `blocked`, `needs-credentials`, or `needs-manual`.
4. **Rate each row:**
   - `voice`: `firsthand` if the audience posts about itself there. Use `secondhand` if others talk about them (for example, engineers on HN discussing non-technical users).
   - `reach`: rough activity, such as `~50/wk`, judged from the probe sample dates or the site itself.
   - `quota`: the number of raw items to collect. Firsthand, accessible sources get most of it. Secondhand rows stay under the cap (`secondhand cap`, default 20%). Rows that are not accessible get quota 0 until fixed.
5. **Open phrase pass.** Read the sample titles in `probe.md`. Write `## Pain phrases` from the audience's own wording: frequent complaints and the words they repeat. Do not take phrases from any product's feature list. `agentic-research collect` always adds these: frustrated, wish, why does, hate, worth it.
6. **Sample fit.** Under the table, write one line per audience group: is there at least one firsthand, accessible source? If not, say so plainly, e.g. "non-tech: no firsthand source accessible; results will be secondhand."
7. Fill `## Source plan` in `../00-brief/brief.md` with one line per group.

**Checkpoint:** keep `approved: no` and show the human the table. Stop. Once they approve, set `approved: yes`, set `stage: 01-collect` in STATUS.md, and log the approval.
