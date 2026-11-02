---
name: make-video
description: Make or edit a video with agentic-video (Remotion), the staged, agent-driven editor. Use when asked to make, edit, cut or render a reel, short, talking-head video, split-screen explainer, launch video, motion-graphics piece or showreel, or to continue or publish a video in .videos/.
---

The tool is the `agentic-video` command. If it is not on PATH, run `node <repo>/dist/cli/main.js`, where `<repo>` is this app's folder: resolve the real path of this skill's folder (it is usually a link), then go up two levels. Read that folder's `README.md` and `MOTION_PHILOSOPHY.md` before your first video in a session.

## Start a video

1. Pick the format from the request: `motion-reel` (VO + motion graphics), `talking-head` (raw footage, a personal story), `explainer` (raw footage plus a diagram canvas: frameworks, lists, "how X works"), `launch` (product, music-led), `showreel` (beat-synced logo piece). Ask if it is unclear.
2. Find the project's brand pack (a folder with `tokens.json`, usually `./brand/`). If there is one, skip to step 3. If not, set one up:
   - **Ask first.** Ask the human whether they have brand material to share: a style guide, colours, font, logo, a site URL, or a video to match. Use what they give you.
   - **Otherwise scan.** If they have nothing or say to go ahead, run `agentic-video brand scan` and read what it lists: Tailwind/theme/CSS variables for colours, font files and `@font-face`/font imports for type, logos and favicons, and the README/landing copy for voice and CTA.
   - **Draft `brand/`** in their repo: `tokens.json` with only the tokens you found (the default pack fills the rest; run `agentic-video brand default` to see its tokens), `brand.md` (voice, claim limits, CTA wording, each marked with where you got it), and `assets/` with copies of the logo and font. Mark tokens taken from web CSS as **web** in `brand.md`: they style a website, not motion. Show it to the human once and adjust it to their answer.
   - If nothing usable turns up and they don't want to give details, carry on without a pack. The built-in default pack is used.
3. From the root of the human's repo, run `agentic-video new <slug> --format <format>`. It uses `./brand/` if present, else the default pack; `--brand <dir>` points to a pack somewhere else.

## Rules

`route` prints which rule groups of `MOTION_PHILOSOPHY.md` apply: `core` plus `motion`, `talking-head` or `explainer`. Follow only those; never carry a motion rule (hook title box, proof cards, dark accent panels, kinetic type) into a talking-head video. Read the **Rejected looks** list before every storyboard and check every still against it. For talking-head and explainer, use only the brand's accent and fonts (the sans, and the accent serif for explainer): no brand panels over footage.

## Work a video

Loop: run `agentic-video route <slug>`, do the stage it prints, update `STATUS.md` (stage line and one log line), then route again.

- Write only inside the current stage folder, plus `assets/`.
- At every CHECKPOINT the router prints, show the human the file and stop. Never write `approved: yes` yourself without their approval in this conversation.
- Scene code is plain JSX. Look at your stills before claiming a scene works.
- `route` prints the project's learnings. Follow them; they are what this human already asked for.
- Whenever the human approves, rejects or corrects something (at a checkpoint or mid-stage), record the reusable lesson: `agentic-video learn <slug> "<what to do or avoid next time>"`. One concrete line, true beyond this video ("CTA always says 'Start free', never 'Sign up'"), not a log of this video's details. Skip one-off fixes.
- Lessons stay in the project. Only when the human explicitly asks to promote one into the shared rules, run `agentic-video learn <slug> --promote "<lesson>"` (or the lesson's line number). Never promote on your own, and never suggest it unprompted.
- `agentic-video transcribe` uploads audio to Groq when `GROQ_API_KEY` is set. Tell the human once per video and use `--engine local` if they say no.
- Paid services (music, generated images or video, cloud transcription) need the human's go-ahead each time.

## Low-resource machines

- Run heavy work (`cut`, `face`, `matte`, `render`, ffmpeg) one at a time, never in parallel, so the machine stays usable. The commands already run at low priority on one thread; when you call ffmpeg yourself, add `-threads 1` (and `nice -n 19` where `nice` exists).
- Kill a stuck job by its PID, never by name pattern (`pkill -f`, `killall`): a pattern can match your own shell or the agent.
- Delete files by explicit path (e.g. `.videos/<slug>/06-qa/stills/t001.0.png`), never with a glob inside a changed directory.

## Finish

After the human approves the render, set `stage: done` and offer `agentic-video publish <slug>`. Before that, if this video taught something new about how the human likes their videos, add it with `agentic-video learn`. If the video used the default pack and the project now has a `brand/`, move `.videos/learnings.md` into `brand/learnings.md`. Publish copies the video, script, storyboard, QA report and caption into `videos/<slug>/`. Do not commit unless asked.
