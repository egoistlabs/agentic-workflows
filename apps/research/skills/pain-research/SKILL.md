---
name: pain-research
description: Run a pain-point study on what a chosen audience says in its own words (Reddit, reviews, Product Hunt, HN, X, YouTube, communities) to decide who to build for, or publish a finished study's results into the current repo. Use when asked to research user pains, validate a market, find a target user, mine community discussions, or publish, share, or bring in pain research or a study's decision.
---

The tool is the `agentic-research` command. If it is not on PATH, run `node <repo>/dist/cli/main.js` instead, where `<repo>` is this app's folder: resolve the real path of this skill's folder (it is usually a link), then go up two levels. Read the repo's `README.md` first.

## Run a study

The research must stay blind to what we are building. Do not read the current project (its README, code, docs, or memory) to write the brief.

1. New study: run `agentic-research new-study <name>`. Write `00-brief/brief.md` from the user's own words only, as a neutral question about an audience and a topic. If the user mentioned a product, company, feature, or hypothesis, move it to `00-brief/sealed.md` and keep it out of `brief.md`.
2. Loop: run `agentic-research route <name>`, do the stage it prints, and update `STATUS.md`. In blind stages (00b–03), never open `sealed.md`.
3. Stop at the two checkpoints the router prints: approving `00b-sources/sources.md`, and picking a target from `04-decide/REVIEW.md`. Ask the user each time.
4. After `decision.md` is written, offer to publish it (below).

## Publish a study

From the root of the repo the user is working in, run `agentic-research publish [name]`. Without a name, it publishes the only finished study, or lists the finished ones. If it lists several, ask the user which one.

It writes `docs/research/<name>/`: an index README, the decision, the review, the clusters, and the counter-evidence. Raw data and `sealed.md` stay behind. Tell the user the folder it wrote. Do not commit unless the user asks.
