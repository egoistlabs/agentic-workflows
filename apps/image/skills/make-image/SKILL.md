---
name: make-image
description: Make a social carousel or single image with agentic-image, the staged, agent-driven image maker that sets text in the brand's real font and design tokens. Use when asked to make or design a carousel, slides for a post, a single-image post, a stat card, quote card or similar, or to continue or publish an image job in .images/.
---

The tool is the `agentic-image` command. If it is not on PATH, run `node <repo>/dist/cli/main.js`, where `<repo>` is this app's folder: resolve the real path of this skill's folder (it is usually a link), then go up two levels. Read this app's `README.md` before your first job in a session.

## Start a job

1. Pick the format from the request: `carousel` (a numbered set of slides, the default) or `image` (one image). Pick the size: `portrait` (1080×1350, the default for Facebook and Instagram), `square` (1080×1080) `story` (1080×1920, TikTok photo posts and Stories) or `fb-cover` (1640×924, a Facebook Page cover; keep text in the middle 1640×624 band that desktop shows). Ask if it is unclear.
2. Find the project's brand pack (a folder with `tokens.json`, usually `./brand/`). Run `agentic-image brand check` to see which tokens it sets, which come from the default pack, and which font file loads; fix any warning with the human. If there is no pack, ask the human for brand material (colours, font, logo, a site to match). With none, the default pack is used.
3. From the root of the human's repo, run `agentic-image new <slug> [--format carousel|image] [--size portrait|square|story|fb-cover]`. It uses `./brand/` if present, else the default pack; `--brand <dir>` points to a pack somewhere else. Make sure the repo's `.gitignore` has `.images/`; ask before adding it.

## Work a job

Loop: run `agentic-image route <slug>`, do the stage it prints, update `STATUS.md` (stage line and one log line), then route again.

- Write only inside the current stage folder, plus `STATUS.md` and the learnings file.
- At every CHECKPOINT the router prints (Copy in `01-copy`, Visuals in `03-render`), show the human the file and stop. Never write `approved: yes` yourself without their approval in this conversation. Log each approval in `STATUS.md` with the human's own words, e.g. `- 2026-10-24 01-copy approved: "looks good, ship it"`.
- Copy approval and visual approval are separate. A version number, a clean QA or the latest render is never approval. Only the human approves visuals.
- Approved copy stays exact, including capitalization and slide order. Any change goes back to `01-copy` for a new approval before it goes into a visual.
- Lettering is never AI-generated: the renderer sets all text. Generated photos and illustrations follow the brand's **Image style**, never contain text or logos, and never show the creator or any real person.
- `agentic-image render <slug> --draft` is only for your own look before copy approval (`03-render/draft/`). Never show a draft as a version or ask for approval on it. `agentic-image preview <slug>` serves the deck live; stop it with Ctrl-C (or by its PID) when done.
- If `render` refuses to export, it names the slide and the element or property (missing token, font fallback, a colour that isn't a token). Fix the deck or layout; change the brand pack only with the human.
- When a command `route` names hasn't been built yet ("arrives in build step N"), stop and tell the human. Don't imitate it by hand.
- `route` prints the project's learnings. Follow the ones that apply to images; they are what this human already asked for.
- Whenever the human approves, rejects or corrects something, append the reusable lesson to the learnings file (`learnings:` in STATUS.md) as `- <date> (<slug>): <what to do or avoid next time>`. One concrete line, true beyond this job. Skip one-off fixes.
- Paid services (image generation) need the human's go-ahead. Approving the copy covers the generated images it lists for this job.
- Never present a generated person as a real learner, customer or testimonial. A generated image moves into the brand's `assets/` for reuse only when the human asks.

## Low-resource machines

- Run renders one at a time, never in parallel.
- Never `pkill -f` or `killall` with a pattern that could match your own shell or the agent. Kill a stuck job by its PID.
- Delete files by explicit path (`rm .images/<slug>/03-render/v2/03.png`), not with a glob inside a `cd`'d command. Never delete an earlier version.

## Finish

After `04-deliver`, set `stage: done` and offer `agentic-image publish <slug>` (if it says it hasn't been built yet, tell the human and stop), which copies the PNGs and caption into the creator's repo (`images/<slug>/`). If the job used the default pack and the project now has a `brand/`, move `.images/learnings.md` into `brand/learnings.md`. Do not commit unless asked.
