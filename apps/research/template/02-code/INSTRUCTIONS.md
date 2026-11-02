# 02 Code

Blind stage: read `../01-collect/selected/` only. Do not open `../01-collect/raw/` or anything in `../00-brief/` other than `brief.md`.

Open coding. There is no starting list of labels: read each item, label it in the poster's terms, and merge labels in stage 03.

Add one row per item in `selected/` to `coded.csv`, with none skipped:

`id,url,source,voice,speaker,sentiment,pain,trigger,tried,pays,intensity,quote`

- `id`, `url`, `source`, `voice`: copied from the item's file name and front matter
- `speaker`: who is talking, judged from the text (`non-tech`, `founder`, `engineer`, `agency`, `unknown`)
- `sentiment`: `pain`, `praise`, or `neutral`. Code praise and neutral items too. If most people are happy, that is a finding.
- `pain`: a short label in the poster's own words. Use `other` when the item names no pain; keep the row anyway. Reuse a label only when it really is the same thing.
- `trigger`: the moment it hurt (first deploy, 20th change, hired a dev…)
- `tried`: what they did about it
- `pays`: `yes` if money, hiring, or a subscription is mentioned; otherwise `no`
- `intensity`: 0 for none (praise or neutral), 1 mild, 2 blocked, 3 gave up or lost money or users
- `quote`: the strongest sentence, verbatim

Quote fields that contain commas. Set `stage: 03-cluster`.
