# 03 Trends

Build 10–30 candidate topics and score each on evidence. Write `topics.md`. Keep every raw response or export in `raw/` here, with its date.

`agentic-smm trends scan|import|score` and `ingest` arrive in build step 6. Until then collect by hand:

| Source | How |
| --- | --- |
| Page comments and DMs | `02-audience/raw/`. The strongest signal |
| Past results | The repo's `content/ledger.csv` and `content/baseline.json`, if they exist |
| agentic-research study | Its clusters and phrases, via `02-audience/audience.md` |
| Google Trends | A CSV the human exports: 90 days and 12 months, rising related queries, your country vs worldwide |
| YouTube | Views of videos on the topic in the last 30 days, if the human or a web search gives them |
| Peer creators | URLs and visible numbers the human pastes into `peers.md` here |
| News | Links the human pastes, or a web search when web tools are available |

**Score** each topic 1–5 on six factors. Use the brief's weights if it changes them.

| Factor | Weight | Evidence |
| --- | --- | --- |
| Demand | 25% | Search interest, autocomplete, recent YouTube views |
| Audience fit | 25% | Matches a ranked pain, or comments ask for it |
| Momentum | 15% | Rising, flat or falling, 90 days vs 12 months |
| Proof on this Page | 15% | Similar past topics vs the baseline; 3 with no history |
| Story coverage | 15% | Approved stories that fit (`<brand>/story-bank.md`) |
| Saturation (inverse) | 5% | 5 = peers' feeds are not crowded with this take |

- Every score cites its source, query, date and number. No evidence: score `?`, never guess. The total is the weighted sum of the scored factors, with the `?` factors listed beside it.
- A topic backed only by your opinion is marked `hunch`. It goes forward only if the human approves it by name.
- A topic tied to a moment is `timely`, with an expiry (default 14 days from the signal). It skips `05-series` and goes to the fast lane. Everything else is `evergreen`.

`topics.md`: one row per topic (name, total, the six scores, `evergreen`/`timely` + expiry, `hunch` if so), then one evidence block per topic. Mark your recommended topics.

CHECKPOINT: show the human `topics.md` and stop. They pick the topics; each `hunch` needs their approval by name. After approval, add `approved: yes` and the approved list, log their words in STATUS.md, copy the snapshot to the repo's `content/trends/<date>.md`, and set the next stage.
