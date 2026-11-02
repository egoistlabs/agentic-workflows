# 10 Review

Measure each posted piece against its format's median, and feed what worked into the next plan. Write `review.md`.

1. **Results** at 1, 3, 7 and 28 days after posting, per piece, using the format's metrics (`formats show <format>`). `agentic-smm pull` and `report` arrive in build steps 4 and 8, `results <slug> <csv>` in step 8. Until then ask the human for the numbers from Meta Business Suite, plus what the API can't see (bookings, orders, DMs), and put them in `results.md` here.
2. **Baseline:** the Page's median per metric over the last 20 posts of the same format (the repo's `content/baseline.json`). No baseline yet: say so, and mark nothing as a winner or miss.
3. **Winners and misses:** a winner is at 1.5× its format's median on the primary metrics; a miss is below 0.5×.
4. **Patterns:** group results by format, hook pattern, angle, topic, series, CTA, size and slot. A learning needs at least 3 pieces in the group and states the sample size. A pattern with fewer than 3 posts in a format stays `untested` for that format.
5. **Learnings:** add dated lessons to `<brand>/learnings.md` (`agentic-smm learn` arrives in build step 8; edit by hand until then), e.g. `- 2026-11-30 (reel, number-first, n=4): …`.
6. **Comments:** turn questions and requests in the comments into backlog ideas (`answer-a-comment`) in the repo's `content/backlog.md`.
7. **Repurposes:** propose winners re-told in another format, e.g. a story reel's steps as a carousel.

The plan is done when every piece has 28-day results. In the full product, stages 08–10 repeat as pieces get made and posted; build step 8 adds that loop. For now, when the review is written and every piece has its 28-day results, set `stage: done` and log one line.
