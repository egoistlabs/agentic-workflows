# agentic-image

Makes social carousels and single images from a brief, in the brand's real font and design tokens. It works on its own or as the producer for agentic-smm's `carousel` and `image` formats.

Built so far: build steps 1 (the scaffold: `new`, `route`, the stage template, the default pack and the skill) and 2 (the renderer: token mapping, font loading, `preview`, `render`, and the `cover`, `note`, `checklist` and `closing` layouts). The rest is in the [Roadmap](#roadmap). The hand-off with agentic-smm is in [docs/producer-contract.md](../../docs/producer-contract.md).

Its rules: lettering is never AI-generated (the renderer sets all text, in the brand's real font and tokens); copy is approved before any visual is made; and only the human approves visuals.

## Setup

Needs Node 22+. Install from the repo root with `npm run setup` (see the root [README](../../README.md#setup)). It builds this app, puts `agentic-image` on PATH and links the `make-image` skill into your agent's skills folder.

Rendering uses `playwright-core`, which ships no browser. The renderer uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if set, else the newest Chromium in Playwright's cache (`~/.cache/ms-playwright/` on Linux, `~/Library/Caches/ms-playwright/` on macOS, `%LOCALAPPDATA%\ms-playwright\` on Windows, or `PLAYWRIGHT_BROWSERS_PATH`), else an installed Chrome or Chromium. With none, run `npx playwright-core install chromium`.

In the creator's repo, add `.images/` to `.gitignore`: jobs live there and stay out of git.

## Making a carousel

In any repo, ask your AI agent to "make a carousel about X". The `make-image` skill runs the stages. Or drive it by hand:

```sh
agentic-image new habits --format carousel --size portrait
agentic-image route habits      # prints the stage and its instructions
agentic-image preview habits    # after 02-layout: the slides at a local URL
agentic-image render habits     # after copy approval: 03-render/v1/01.png…
```

Stages: `00-brief` → `01-copy` → `02-layout` → `03-render` → `04-deliver`. You approve the copy (`01-copy/copy.md`) and, separately, the visuals (`03-render/visuals.md`). A checkpoint counts as approved only when its file has an `approved: yes` line, and `route` refuses to go on if an earlier one is missing. The stage order and checkpoints are in `template/stages.json`.

## Brand pack

The tool ships a default pack (`brand/default/`): colours, a type scale, spacing, radius, safe margins and the Geist font. A project overrides it with its own `brand/` folder, which `new` picks up automatically (or `--brand <dir>`). The project pack only needs the tokens it changes; `agentic-image brand check` shows which tokens it sets and which come from the default.

```
brand/
  brand.md       voice, claim limits, CTA wording, Image style
  tokens.json    {"bg","fg","accent","muted","font","fontFile","typeMin","space1",…}
  assets/        the font file, logos, approved photos
  learnings.md   lessons from past jobs, shared with agentic-video and agentic-smm
```

`tokens.json` may also hold an `image` object: tokens for slides only (for example a light theme while videos stay dark). It is laid over the pack's top-level tokens, and the other apps ignore it.

With the default pack, learnings go in `.images/learnings.md`.

## Layouts

| Layout | For |
| --- | --- |
| `cover` | The first slide: a hook title, an optional image |
| `note` | One point with a short body; optional dialogue line as a speech bubble |
| `checklist` | A title and 3–6 items |
| `closing` | The takeaway and the call to action |
| `native` | A statement plus one native-OS-style UI card (a ticket, PR, chat message, notification, calendar invite) that acts out the point |

Fields and word limits are in each layout's `layout.json` and in `template/02-layout/INSTRUCTIONS.md`.

## Commands

| Command | Does |
| --- | --- |
| `agentic-image new <slug> [--format carousel\|image] [--size portrait\|square\|story\|fb-cover] [--brand <dir>]` | Copies the stages into `.images/<slug>/` and writes `STATUS.md`; brand is `--brand`, else `./brand/`, else the default |
| `agentic-image route <slug>` | Current stage, its instructions, checkpoints, learnings and recent log |
| `agentic-image brand check [<dir>]` | Which tokens a pack sets, which come from the default, and the font file it loads |
| `agentic-image preview <slug> [--port n]` | Serves the deck at a local URL (default port 4180) until Ctrl-C; reloads when `deck.json`, a layout or the tokens change, and shows deck errors |
| `agentic-image render <slug>` | Renders the next version into `03-render/v<n>/` (`01.png`… in posting order, `deck.json`, `render.json`), one slide at a time at low priority. Needs approved copy |
| `agentic-image render <slug> --draft` | Renders into `03-render/draft/` before copy approval. Never a version, never shown for approval |

`qa`, `deliver` and `publish` arrive in build step 3.

## How rendering works

Each slide is HTML and CSS, rendered to PNG by Chromium through Playwright, at the job's size (`portrait` 1080×1350, `square` 1080×1080, `story` 1080×1920, `fb-cover` 1640×924) and a device scale of 1.

- **Tokens:** at render time every token `x` in the merged pack (default plus project) becomes the CSS property `--x` on `.slide`; a token can refer to another (`"surface": "color-mix(in srgb, var(--fg) 8%, var(--bg))"`). Layout CSS reads only `var(--…)`: a test fails on any colour literal, px size or font of its own.
- **Font:** the pack's `fontFile` is served by the local server and loaded with `@font-face` under the first family in `font`. A pack may also set an optional mono face, `fontMono` and `fontMonoFile` (e.g. for terminal or code text), loaded the same way; layouts set it with `font-family: var(--fontMono)`.
- **Export guards:** the export refuses, naming the slide and the element or property, when a required token is missing (or a layout reads a property no token sets); when the font didn't load, a text element's `font-family` isn't the brand font (or the pack's mono font), or a character is drawn by another font or as an empty box (e.g. a chess symbol like `♞` is not in Geist); or when a computed colour (text, background, gradient, border, shadow) isn't a colour token. Slides load nothing from the network.
- **Layouts** live in `layouts/<name>/`: `layout.json` (fields and limits), `layout.html` (a small Mustache-style template) and `layout.css`. A job's own `02-layout/layouts/<name>/` comes first. The deck format is in `template/02-layout/INSTRUCTIONS.md`.

## Layout

```
src/core/        job state, stage map, sizes, brand packs, token mapping, deck model, layouts, slide page
src/renderer/    local slide server (node:http), Playwright export and its guards, Chromium lookup
src/cli/         the agentic-image command
renderer/        browser-side files: the slide base CSS, the in-page export checks, the preview chrome
layouts/         shared layouts: cover, note, checklist, closing, native
brand/default/   the default pack: tokens, brand.md, Geist and its licence
template/        stage folders with INSTRUCTIONS.md, and stages.json (order and checkpoints)
skills/          make-image/SKILL.md, the agent skill
tests/           node:test (npm test)
```

The tool is TypeScript (`npm run build`, `npm run lint`, `npm test`).

## Roadmap

Build steps not done yet. A command or stage that says "arrives in build step N" refers to this table.

| Step | Builds |
| --- | --- |
| 3 | `qa` (text inside the slide and safe margins, real font and tokens, contrast of at least 4.5:1, nothing under the type minimum, word and item limits, slide count and pixel and file size), `deliver` (final PNGs and `caption.md`) and `publish` (copies them to the creator's repo, default `images/<slug>/`) |
| 4 | The remaining layouts: `statement`, `stat`, `quote`, `before-after`, `screenshot`, `steps` |
| 5 | `new --from <brief.md>` and `asset.json` for agentic-smm, per the [producer contract](../../docs/producer-contract.md) |
| 6 | Image generation from the brand's **Image style**, with an image provider still to be chosen |
| 7 | Converting an existing design system into a brand pack (`tokens.json`, `brand.md`, `assets/`) |

`learn` is not built yet: append lessons to the learnings file by hand.
