# How a study finds real pain without bias

A study answers one question about one audience by reading what that audience posts, in its own words. Two risks shape the workflow:

- **Wrong voice.** Reading people who talk *about* the audience instead of the audience itself.
- **Our own hopes.** Searching for and reading evidence through what we want to build.

No study can promise the truth, because the sample is only what people chose to post where we could reach. What the workflow guarantees is a blind process, verbatim evidence, and stated limits.

## The stages

| Stage | Produces | Knows about our product? |
| --- | --- | --- |
| 00-brief | Neutral question and audience; product context sealed away | Writes `sealed.md`, then leaves it |
| 00b-sources | Source table and audience phrases. **A human approves it** | No |
| 01-collect | Raw items, then a budgeted selection | No |
| 02-code | One coded row per item | No |
| 03-cluster | Ranked clusters and evidence against them | No |
| 04-decide | Review split into market and interpretation. **A human picks** | Yes, from here on |

`agentic-research route <study>` prints the current stage, its instructions, and any checkpoint. A fresh agent can resume from `STATUS.md` alone.

## Sources follow the audience

The brief names the audience: who they are, the words they use about themselves, and the tools they use. It does not name sources. Stage 00b chooses sources by rating each candidate on three things:

- **Voice:** firsthand if the audience posts about itself there, secondhand if others talk about them.
- **Reach:** how active the source is.
- **Access:** whether we can collect from it here, tested with one real request (`agentic-research collect --probe`).

Firsthand, accessible sources get most of the quota. Secondhand sources are capped. A source that is blocked or needs credentials is reported as such, never passed off as empty.

Available sources and what each needs are in [`sources/registry.json`](../sources/registry.json). Sites that block scripts take hand-saved items instead.

## A budget caps what gets read

Collection stops at each source's quota. Before coding, `agentic-research select` picks the items that best match the audience and its pain phrases, enforces the secondhand cap, and trims each item. This step uses no model calls. Stage 02 reads only the selection, so the cost of a study is set by the brief's budget, not by how much was collected.

## Blind stages keep our hopes out

- **The brief is split.** `brief.md` holds the neutral question, audience, time window, and budget. Our product, goals, and hypotheses go in `sealed.md`.
- **The question names a topic, never our answer.** Write "What problems do non-technical people hit when building apps with AI tools?", not "Do vibe coders need code-quality guardrails?"
- **Only 04-decide opens `sealed.md`.** The skill writes the brief from the user's words, without reading the project it was started from.
- **Search terms come from the audience.** 00b reads real post titles from the chosen sources and takes phrases from them. Every study also adds open phrases such as "frustrated", "wish", and "hate".

## Coding follows the data

- Labels come from the items, in the poster's terms. There is no starting label list.
- Praise and neutral items are coded too. If most people are happy, that is a finding.
- An item with no matching pain is labelled `other` and kept.

## Evidence rules

- Every claim cites at least two verbatim quotes with links. A claim with one source is marked `weak`.
- Counts come from `coded.csv` through `agentic-research count`, never from memory.
- `clusters.md` opens with a **Sample** section: counts per source and voice, the firsthand share, and groups with too few items to conclude anything.
- `clusters.md` ends with **What this data cannot tell us**: who is missing, platform skew, the time window, and the fact that complaints are over-represented online.
- `disconfirming.md` records the strongest evidence against each top cluster, such as people who hit the problem and did not care.

## The decision separates fact from interpretation

`REVIEW.md` has two labelled parts:

1. **What the market says:** copied unchanged from the cluster findings.
2. **What it means for us:** our hypotheses checked against those findings, with any unsupported ones named first, plus candidate targets marked as resting on firsthand or secondhand evidence.

A human picks the target before `decision.md` is written.
