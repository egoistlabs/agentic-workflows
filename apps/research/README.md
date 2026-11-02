# agentic-research

Find what a chosen audience says about its problems, in its own words. Rank those problems and decide who to build for. Each study is a folder of numbered stages, and one agent works through them using only the files.

How sources are chosen and how studies stay neutral: [docs/approach.md](docs/approach.md).

## Setup

From the root of the agentic-workflows folder, run `npm run setup` (see the [root README](../../README.md#setup)). It installs and builds the tool, puts `agentic-research` on PATH and links the `pain-research` skill into your AI agent's skills folder.

Source keys are optional. Put them in a `.env` file at the agentic-workflows root (copy [`.env.example`](../../.env.example)), or in your project to override it. Real environment variables win.

## Running a study

In any repo or workspace, ask your AI agent to "run a pain study on X". The skill does not read the host project, so the brief stays neutral. Or drive it by hand:

1. Run `agentic-research route <study>` to see the current stage and its instructions.
2. Do that stage. Write only into that stage's folder.
3. Update the study's `STATUS.md`, then run the router again.

Stages: `00-brief` → `00b-sources` → `01-collect` → `02-code` → `03-cluster` → `04-decide`. There are two human checkpoints: approving `00b-sources/sources.md`, and picking a target from `04-decide/REVIEW.md` before `decision.md` is written.

Studies live in this app's own folder, `apps/research/.studies/<name>/`, never in your project, and git ignores them. Nobody else sees a study until you publish it.

## Sharing results with your team

Once a study has a `decision.md`, copy its results into the repo or workspace your team works in:

1. Open that repo and ask your AI agent to "publish the pain research", or run `agentic-research publish` from its root. Pass a study name if you have more than one finished study.
2. Review `docs/research/<study>/`, then commit it like any other doc.

The folder holds an index README, the decision, the review, the ranked pains with quotes and links, and the evidence against them. Raw posts, `coded.csv` and `sealed.md` stay in your `.studies/`. The "What it means for us" half of `REVIEW.md` names your product, so check it before publishing anywhere public.

Publishing again overwrites that study's folder. Use `--to <repo>` to publish into a repo other than the current one.

## Commands

| Command | Does |
| --- | --- |
| `agentic-research new-study <name>` | Copies `template/` to `.studies/<name>/` |
| `agentic-research route <name>` | Prints the current stage, recent log, checkpoints and instructions |
| `agentic-research collect <name> --probe [source:target …]` | Sends one request per source; reports ok, blocked, needs-credentials or needs-manual; writes `00b-sources/probe.md` with sample titles |
| `agentic-research collect <name>` | Runs each approved source up to its quota and logs counts per source and per voice |
| `agentic-research select <name>` | Budget guard (no model calls): scores, applies quotas and the secondhand cap, writes `01-collect/selected/` |
| `agentic-research count <name> [--by cluster]` | Sample and per-cluster counts from `coded.csv` |
| `agentic-research publish [name] [--to <repo>] [--into <folder>]` | Without a name, picks the only finished study or lists them. Copies the readable results (decision, review, clusters, counter-evidence, plus an index) into `<repo>/docs/research/<name>/`; defaults to the current directory. Raw data, `coded.csv` and `sealed.md` stay behind |

## Sources

`sources/registry.json` lists every source, with its audiences, voice, required env vars, and fetcher. When a source is blocked, `collect` falls back to items saved by hand in `01-collect/manual/<source>/` (`.md` files with `url` and `date` front matter).

| Source | Needs |
| --- | --- |
| hn, pullpush, trustpilot | nothing |
| reddit | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` (a "script" app at reddit.com/prefs/apps; the public JSON returns 403) |
| producthunt | `PRODUCTHUNT_TOKEN` |
| youtube | `YOUTUBE_API_KEY` |
| x | `X_BEARER_TOKEN`, or manual export |
| g2, discord, skool, websearch | manual export only |

## Known limits

- Collection and the default pain phrases assume English. The X fetcher searches only English posts (`lang:en` in `src/fetchers/x.ts`). For another language, write the brief's audience words and `## Pain phrases` in that language and add hand-saved items in `01-collect/manual/`.
- A study reads only what people posted where it could reach, so complaints are over-represented. `clusters.md` states what the data cannot tell you.

## Development

| Command | Does |
| --- | --- |
| `npm run dev -- <command> [args]` | Runs the CLI from `src/` without building |
| `npm run build` | Compiles `src/` to `dist/` |
| `npm run lint` | Prettier check and typecheck |
| `npm run format` | Formats `src/` |

`src/core/` holds the logic as functions that return data (`studyState`, `probeSources`, `collect`, `select`, `count`). The package exports them from `src/core/index.ts`, so another front end can call them directly. `src/cli/` only prints their results.

To add a source, implement the `Fetcher` interface (`probe` and `fetch`, in `src/core/types.ts`) in `src/fetchers/<id>.ts`. Then register it in `src/fetchers/index.ts` and add an entry to `sources/registry.json`.

## Layout

```
src/core/        study files, collect, select, count, router state
src/fetchers/    one module per source
src/cli/         the agentic-research command
template/        stage folders with INSTRUCTIONS.md; copied for each study
sources/         registry.json
skills/          pain-research/SKILL.md, linked into your agent's skills folder by `npm run setup`
docs/            approach.md
.studies/        your studies (git-ignored)
```
