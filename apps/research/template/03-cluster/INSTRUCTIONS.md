# 03 Cluster

Blind stage: read `../02-code/coded.csv` and `../01-collect/selected/` only. Do not open anything in `../00-brief/` other than `brief.md`.

1. Merge similar `pain` labels into clusters. Add a `cluster` column to `coded.csv`. Every row gets one, including praise, neutral, and `other` rows.
2. Run `agentic-research count <study> --by cluster`. Every count, share, average, and score in `clusters.md` comes from this output, never from memory. Score = count × average intensity × (1 + share that pays).
3. Write `clusters.md`:
   - **Sample** first: paste the script's Sample section, then name the gaps in plain words (e.g. "non-tech firsthand: 12 items, too few to conclude").
   - A ranked table of clusters, from the script.
   - One section per cluster: main speakers, common trigger, and the firsthand share. Add at least two verbatim quotes with links. Mark a claim `weak` if it rests on one source or one quote.
   - What the praise and neutral items say, stated as findings.
   - **What this data cannot tell us**: who is missing, platform skew, the time window, and the fact that complaints are over-represented online.
4. Write `disconfirming.md`: for each of the top three clusters, the strongest evidence *against* its importance, with quotes and links. Look for people who hit the problem and did not care, found it easy to fix, or say the opposite. If you find none, say so and note where you looked.

Set `stage: 04-decide`.
