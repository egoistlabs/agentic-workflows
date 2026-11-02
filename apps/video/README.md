# agentic-video

Agent-driven video editing on Remotion, for any project. Each video is a folder of numbered stages that an agent works through, and you approve the script, the cuts, the storyboard and the final render. The craft rules every video follows are in [MOTION_PHILOSOPHY.md](MOTION_PHILOSOPHY.md).

## Setup

Install from the repo root with `npm run setup` (see the root [README](../../README.md#setup)). It builds the tool, puts `agentic-video` on PATH and links the `make-video` skill into your agent's skills folder.

Needs only Node 22+. Speech in any of Whisper's ~100 languages works; pass `--language` (e.g. `es`, `de`, `hi`, `tl`), or English is assumed. For mixed speech such as Spanglish, Hinglish or Taglish, pass the non-English language. Transcription runs Whisper inside Node, and ffmpeg comes bundled with Remotion; the first transcription downloads the model (~80 MB for `base`).

Optional: for the most accurate transcription, especially non-English or mixed-language speech, add a free [Groq](https://console.groq.com/keys) key. Copy the agentic-workflows root [`.env.example`](../../.env.example) to `.env` (at the agentic-workflows root, or in your project) and fill in `GROQ_API_KEY`. `transcribe` then uses Whisper large-v3 on Groq, which uploads the audio; `--engine local` keeps it on your machine.

Optional: for faster local transcription of long footage, point `WHISPER_PY` at a Python with `faster-whisper` installed (`tools/transcribe.py` then runs instead, and needs a system ffmpeg).

Remotion downloads its own headless Chrome on the first render.

**Remotion licence:** Remotion is free for individuals and for companies of up to 3 people; larger companies need a company licence. Check this for each project that uses the tool.

Talking-head videos use two more optional tools, and work without them:
- **A full ffmpeg** (`ffmpeg` on PATH, or `$FFMPEG`) lets `cut` render in one decode pass and `refsheet` draw contact sheets. Without it, `cut` renders one segment at a time with the bundled build; `refsheet` needs it.
- **Face tracking** uses MediaPipe through [uv](https://docs.astral.sh/uv/) (`uv run --with mediapipe`, installed on first use) or `$FACE_PY`, a Python with `mediapipe` and `opencv-python-headless`. The model (~4 MB) is cached in `~/.cache/agentic-video/`. Without it, overlays use fixed zones.

All heavy work runs one job at a time, single-threaded and at low priority, so a small laptop stays usable.

## Making a video

In any repo, ask your AI agent to "make a reel about X" or "edit this footage". The skill runs the stages. Or drive it by hand:

```sh
agentic-video new launch-reel --format motion-reel --brand ./brand
agentic-video route launch-reel      # prints the stage and its instructions
```

Stages: `00-brief` → `01-references` → `02-story` → `03-source` → `04-storyboard` → `05-build` → `06-qa` → `07-render`. Formats skip the stages they don't need (`formats/*.json`).

Formats: `motion-reel` (VO + motion graphics), `talking-head` (raw footage, the speaker fills the frame), `explainer` (raw footage split with a diagram canvas, full-face punch-ins for the lines that matter; [spec](specs/explainer-format.md)), `launch` (30–90 s product piece, music-led, 16:9) and `showreel` (~15 s, ends on a logo).

Videos live in `.videos/<slug>/` in your repo; add `.videos/` to its `.gitignore`. When one is done, `agentic-video publish <slug>` copies the deliverables (the MP4, the script or structure, the storyboard, the QA report and the post caption) into `videos/<slug>/`.

## Brand pack

The tool ships a default pack (`brand/default/`). A project overrides it with its own `brand/` folder, which `new` picks up automatically (or `--brand <dir>`). The project pack only needs the tokens it changes; the rest come from the default. With no pack, the agent first asks you for brand material, then falls back to `agentic-video brand scan` and drafts one from your repo's theme, CSS, logos, fonts and README for you to approve.

```
brand/
  brand.md       voice, claim limits, CTA wording
  tokens.json    {"bg","fg","accent","accentGlow","muted","hookBg","hookFg","fontFile","fontAccent","fontAccentFile","state",…}
  assets/        font, logo, mascot sheets, handouts (copied into each video as assets/brand/)
  learnings.md   lessons from past videos, appended by `agentic-video learn`
```

Videos never write to the brand pack, except to append to `learnings.md` through `agentic-video learn`.

## Learnings

Each project keeps a learnings file: `brand/learnings.md`, or `.videos/learnings.md` when the project uses the default pack. When you approve, reject or correct something, the agent records the reusable lesson with `agentic-video learn`. `route` prints the file at every stage, so each video starts from what earlier ones taught. Commit `brand/learnings.md` to share it; edit or prune it by hand whenever you like.

## Commands

| Command | Does |
| --- | --- |
| `agentic-video new <slug> [--format f] [--brand dir]` | Copies the format's stages into `.videos/<slug>/`; brand is `--brand`, else `./brand/`, else the default |
| `agentic-video brand scan` | Lists files in your repo that likely hold colours, fonts, logos and voice |
| `agentic-video brand default` | Prints the default pack's path and tokens |
| `agentic-video learn <slug> "<lesson>"` | Appends a lesson to the project's learnings file |
| `agentic-video learn <slug> --promote "<lesson>"\|<n> [--group g]` | Maintainer only, on request: adds a lesson (text, or line `n` of learnings.md) to a rule group in `MOTION_PHILOSOPHY.md` |
| `agentic-video route <slug>` | Current stage, instructions, open checkpoint |
| `agentic-video transcribe <audio> <out.json> [--model m] [--language l] [--engine local\|groq]` | Word timings: Groq if `GROQ_API_KEY` is set, else local Whisper in Node (faster-whisper if `$WHISPER_PY` is set) |
| `agentic-video ffmpeg <args…>` | Remotion's bundled ffmpeg (WAV/PNG/MP4 out; no `fps`/`tile`/`select` filters) |
| `agentic-video refsheet <slug> <file\|url> [--fps 1]` | Timestamped contact sheets and scene-cut times of a reference into `01-references/<name>/` (URLs via `uvx yt-dlp`) |
| `agentic-video silences <slug> [clip]` | Pauses in the clip (−33 dB, ≥ 0.25 s), cached in `03-source/silences.json` |
| `agentic-video cut <slug> [--preview] [--speed s]` | Renders `03-source/keep.json`: edges snapped to silences, pauses removed, one decode pass. Writes `cut.mp4`, `cut-audio.wav`, `cut-last.png`, `words-cut.json`, `edl.json`, `cut-map.json` into `assets/` (`--preview`: `03-source/rough-cut.mp4` at 540p) |
| `agentic-video face <slug>` | Tracks the speaker's face on the cut into `assets/face.json` |
| `agentic-video matte <slug>` | Cuts the speaker out of the cut into `assets/cut-alpha.webm` for the explainer's head break-out (then run `timeline` again) |
| `agentic-video sfx <slug> [--palette soft\|loud]` | Synthesises the format's SFX into `assets/sfx/` |
| `agentic-video timeline <slug>` | Talking-head: `05-build/cues.json` + the cut → `timeline.json` (camera, events, SFX, captions) |
| `agentic-video stills <slug> <seconds…> [--safe-zone] [--sheet]` | PNG stills into `06-qa/stills/` (and a contact sheet); records overlay and caption boxes for QA |
| `agentic-video qa <slug>` | Checks the format's rules (R1, R2, R3, R5, R8; T1, T4, T5, A/V sync for talking-head and explainer; X1, X2, X5 and the head break-out for explainer), contrast, emoji and loudness; writes `06-qa/qa.md` |
| `agentic-video render <slug>` | `07-render/<slug>.mp4`, loudness-normalised to −14 LUFS |
| `agentic-video publish [slug] [--to repo]` | Copies the deliverables to `videos/<slug>/` |

## Layout

```
engine/          Remotion root, footage layer, face-aware Zone, shared components (captions, hook, kinetic type, proof card, native UI…)
src/core/        video state, cut, face, timeline, render, qa, transcribe, publish (functions returning data)
src/cli/         the agentic-video command
template/        stage folders with INSTRUCTIONS.md
formats/         format manifests: stages, checkpoints, size, QA limits
skills/          the make-video agent skill (SKILL.md)
specs/           explainer-format.md, the explainer format's design
tools/           transcribe.py, face.py, matte.py
```

Scenes are plain JSX that import from `@engine`. The tool itself is TypeScript (`npm run build`, `npm run lint`).

## Constraints

- Secrets come only from environment variables (the agentic-workflows root `.env.example` lists them). The tool never logs their values.
- Paid generation (music, images, video, cloud transcription) needs the human's go-ahead for each run.
- Content is invented or brand-supplied. The tool never fabricates testimonials, results or real people's likenesses, and never generates footage of real people.

## Known limits

- Transcription works in any Whisper language, but two checks assume English: the `keyword` caption style picks keywords against an English filler-word list, and QA's R2 check recognises numbers as digits or English number words (one to ten). For other languages, pass extra filler words through the captions' `stop` prop (`captions.stop` in `cues.json`), and expect R2 to flag a hook that spells its number out.

## Roadmap

Not built yet:

- **Beat sync** (`agentic-video beats <audio>`): a beat grid so `showreel` and `launch` cut on the music. Both formats run today on the motion pipeline without it.
- **Style library:** a versioned set of reusable motion cards and scene templates the storyboard picks by id.
- **Stage skills:** separate skills for storytelling, reference teardowns, storyboard, build and QA, under the `make-video` entry point.
- **Tests:** `node:test` coverage for `src/core`.
