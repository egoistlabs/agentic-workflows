---
name: plan-content
description: Plan a personal brand's social content with agentic-smm, the staged, agent-driven content planner for one Facebook Page. Use when asked to plan social content, make a content calendar, decide what to post on the Facebook Page, find topics or ideas for posts, or continue a plan in .plans/.
---

The tool is the `agentic-smm` command. If it is not on PATH, run `node <repo>/dist/cli/main.js`, where `<repo>` is this app's folder: resolve the real path of this skill's folder (it is usually a link), then go up two levels. Read this app's `README.md` before your first plan in a session.

agentic-smm decides what to say, in which format, and when. It never makes the video or the images: producers (agentic-video, agentic-image, the human) do, through files.

## Start a plan

1. Work from the root of the creator's repo. Check that `.plans/` is in its `.gitignore`; plans hold personal stories and income numbers. If it is missing, ask before adding it.
2. Ask the human the horizon and posts per week if they didn't say (defaults: 4 weeks, 7 per week).
3. Run `agentic-smm new <slug> [--weeks n] [--per-week n]`. It uses `./brand/` (`--brand <dir>` points elsewhere); `00-brief` drafts `brand/brand.md` if there is none.

To continue a plan, list `.plans/` and pick the one the human means; ask if it is unclear.

## Work a plan

Loop: run `agentic-smm route <slug>`, do the stage it prints, update `STATUS.md` (the `stage:` line and one log line), then route again.

- Write only inside the current stage folder, plus the long-lived files the stage's instructions name (`brand/`, `content/`), and only after the approval they require.
- At every CHECKPOINT the router prints, show the human the file and stop. Never write `approved: yes` yourself without their approval in this conversation.
- Record each approval in the `## Log` of `STATUS.md` with the human's own words: `- <date> <stage>: approved <file>: "<their words>"`.
- When a stage needs a command that doesn't exist yet, its instructions say "(arrives in build step N)": do that work by hand in the stage folder. Don't build the command.
- Never invent stories, numbers, testimonials, audience quotes or trend data. A score with no evidence is `?`.
- `route` prints the learnings in `brand/learnings.md`. Follow them; they are what earlier plans taught.
- Never post, schedule or upload anything without an approved batch, and never edit, delete or boost a live post. Never put the Page token or other `.env` values in plan files or logs.
- Paid services and anything that goes public need the human's go-ahead each time.

## Low-resource machines

- Run heavy work one job at a time, never in parallel.
- Never `pkill -f` or `killall` with a pattern that could match your own shell or the agent. Kill a stuck job by its PID.
- Delete files by explicit path, not with a glob inside a `cd`'d command.

## Finish

The plan is done when `route` says so (`stage: done`). Do not commit unless asked.
