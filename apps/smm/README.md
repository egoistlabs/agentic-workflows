# agentic-smm

An agentic social media manager for one Facebook Page. It decides what to say, in which format and when, hands each piece to the tool that makes it, schedules what you approve, and feeds the results into the next plan. Each plan is a folder of numbered stages that an agent works through, and you approve the stories, topics, shortlist, series, pieces, calendar and every batch before it posts. It is built for a solo creator running one Facebook Page. Everything specific to a creator (voice, offer, audience, language, slots) comes from the plan's brief and the brand pack, so it works for any creator.

```
agentic-research ─┐                          ┌─► agentic-video   (reels)            ─┐
                  ├─► agentic-smm  ──────────┼─► agentic-image   (carousels, images) ├─► agentic-smm ─► Facebook Page
trend sources ────┘   (what, which format,   └─► you, by hand    (text, other)      ─┘   (schedule, track)
       ▲               when)                                                                   │
       └──────────────────── results and comments feed the next plan ◄─────────────────────────┘
```

It decides **what to say, in which format, and when**. It never makes the video or the images itself: producers do, through files ([docs/producer-contract.md](../../docs/producer-contract.md)). Pieces are grouped into **series** under one big topic, so viewers have a reason to follow for the next one; only timely topics go out as lone pieces, through a weekly fast-lane slot.

Not in v1: platforms other than one Facebook Page, making any asset, paid ads or boosting, replying to comments, and scraping sites that forbid it.

Built so far: build step 1 (plan scaffold). Stages that need a later command tell the agent to do that work by hand; the rest is in the [Roadmap](#roadmap).

## Setup

Needs only Node 22+. Install from the repo root with `npm run setup` (see the root [README](../../README.md#setup)). It builds this app, puts `agentic-smm` on PATH and links the `plan-content` skill into your agent's skills folder.

## Making a plan

In the creator's repo, ask your AI agent to "plan next month's content" or "what should I post on the Page". The `plan-content` skill runs the stages. Or drive it by hand:

```sh
agentic-smm new november --weeks 4 --per-week 7
agentic-smm route november      # prints the stage and its instructions
```

Stages: `00-brief` → `01-story-bank` → `02-audience` → `03-trends` → `04-ideas` → `05-series` → `06-pieces` → `07-calendar` → `08-produce` → `09-schedule` → `10-review`. The checkpoints are in `template/stages.json`: a checkpoint file needs an `approved: yes` line before the plan moves on, and `route` refuses a plan that skipped one.

Plans live in `.plans/<slug>/` in the creator's repo. They hold personal stories and income numbers: add `.plans/` to its `.gitignore`.

The brand pack is `./brand/` (or `--brand <dir>`): `brand.md`, `story-bank.md` and `learnings.md`. `route` prints the learnings at every stage.

## Files it keeps

These outlive a single plan and live in the creator's repo:

| File | Holds |
| --- | --- |
| `brand/brand.md` | Voice, language, tone, offer wording, claim limits. The agent drafts it on the first run; the creator owns it. Shared with the producers, along with `tokens.json` |
| `brand/story-bank.md` | True stories: when, what happened, the real number, the feeling, what changed, share level (`public`, `soft` = without numbers, `private`) |
| `brand/learnings.md` | Dated lessons by format, pattern, topic, size and slot, each with a sample size. Shared with the producers |
| `content/backlog.md` | Unused ideas with score, formats, source signal, status (`new`, `planned`, `posted`, `killed`) and expiry if timely |
| `content/trends/<date>.md` | Trend snapshots |
| `content/ledger.csv` | One row per piece across all plans: format, producer, state, files, scheduled time, post id, link. States: `planned` → `briefed` → `produced` → `scheduled` (or `scheduled-manual`) → `posted` → `measured` |
| `content/baseline.json` | Medians per format over the last 20 posts of that format, and the best posting slots so far |
| `content/used.md` | Every story and hook posted, with dates and formats |

Publishing a plan copies the calendar and piece briefs into `content/<slug>/` without `private` or `soft` details. The agent asks before publishing anywhere public. The Meta app ID, Page ID and Page token live in `.env` (git-ignored) and never appear in plan files or logs.

## Commands

| Command | Does |
| --- | --- |
| `agentic-smm new <slug> [--weeks n] [--per-week n] [--brand dir]` | Copies the stages into `.plans/<slug>/` and writes `STATUS.md` (defaults: 4 weeks, 7 per week, `./brand/`) |
| `agentic-smm route <slug>` | Current stage, instructions, learnings, recent log, open checkpoint |
| `agentic-smm formats list\|show <id>` | The installed formats and their brief templates |

## Layout

```
src/core/        plan state, brand pack, format manifests (functions returning data)
src/cli/         the agentic-smm command
template/        stage folders with INSTRUCTIONS.md; stages.json holds the order and checkpoints
formats/         one folder per format: format.json + brief.md (reel, carousel, image, text)
skills/          plan-content/SKILL.md, the agent skill
tests/           node:test (`npm test`)
```

The tool is TypeScript (`npm run build`, `npm run lint`, `npm test`). Network access arrives in build step 4 and is planned to live only in `src/adapters` (not there yet); adapters save every raw response with a timestamp, so each score traces back to its source, and tests run on recorded responses.

## Roadmap

Build steps not done yet. A stage that says "arrives in build step N" refers to this table.

| Step | Builds |
| --- | --- |
| 2 | `story add\|list` and `check` (true stories only, offer pitches at most 1 in 4, no repeats too soon, complete pieces, calendar rules) |
| 3 | `calendar`, `export` (producer briefs and batch checklists), `asset add`, `check --asset`, the ledger; `--from` and `asset.json` in agentic-video |
| 4 | Reading from Meta: a Graph API test run that confirms permissions, limits and metrics, `auth check`, `pull --baseline`, `pull --comments`, `report` |
| 5 | `ideas` (the idea matrix, scoring, dedupe at word overlap above 0.6) and `backlog list\|pull\|kill` |
| 6 | `ingest <study>` (an agentic-research study) and `trends scan\|import\|score` |
| 7 | `schedule [--dry-run] [--now]` for reels, photo, multi-photo and text posts, with `approval.json` and the manual upload-sheet fallback |
| 8 | The full loop: timed pulls at 1, 3, 7 and 28 days, `results`, review, repurposes, `learn`, `extend` |

Reading from Meta comes before posting to it, so the first plan has a baseline and nothing public goes out while the planning stages are new. After one full cycle on Facebook, Instagram is the next platform.
