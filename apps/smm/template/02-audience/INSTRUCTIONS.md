# 02 Audience

Write `audience.md`: the audience's pains, ranked, in their own words. Hooks in later stages reuse these phrases.

Sources, strongest first:

- **Page comments and DMs.** `agentic-smm pull --comments` arrives in build step 4. Until then ask the human to paste recent comments and DMs into `raw/` here.
- **An agentic-research study.** `agentic-smm ingest <study>` arrives in build step 6. Until then ask the human for the study: agentic-research keeps it in its own folder (`apps/research/.studies/<name>/` in the agentic-workflows checkout), or a published copy is in `docs/research/<name>/` of their repo and read its clusters and decision.
- **What the human tells you** about the people they talk to.

For each pain: a one-line name, 2–5 exact quotes (source and date for each), how often it came up, and the words the audience uses for it. Rank by frequency and strength.

With no comments, DMs or study, work only from what the human supplies and put `status: unvalidated` at the top of `audience.md`. Never guess how the audience talks, and never write a quote nobody said.

Set `stage:` to the next stage and log one line.
