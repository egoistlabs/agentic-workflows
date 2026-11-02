# The `explainer` format (split-screen explainer)

A vertical explainer made from raw footage: a motion-graphics canvas above, the speaker in a footage card below, and full-face punch-ins for the lines that matter. Use it for frameworks, lists and "how X works" videos.

It sits between the two other footage formats:

- **`talking-head`** keeps the speaker in frame almost all the time (T1), with small native overlays beside the head (T4). It suits personal stories, but it can't teach a structure: there's no room for a diagram, and full-screen cards are allowed only once.
- **`motion-reel`** is graphics only, with a VO. It loses the face, which carries the trust.

The explainer keeps both. The canvas is its own region, with original diagrams drawn in light on a neutral ground; the footage never sits under it, and it is never a set of dark boxed cards over footage (see "Rejected looks" in [MOTION_PHILOSOPHY.md](../MOTION_PHILOSOPHY.md)).

Each beat takes one of three layouts, chosen in the storyboard, so the mix is a dial and not a fixed look. Diagrams build on the spoken word, cue-matched like talking-head overlays. B-roll generation, music beds and horizontal versions are not part of the format.

## 1. Layouts

At 1080×1920:

| Layout | Footage | Canvas | Captions | Used for |
| --- | --- | --- | --- | --- |
| `split` | rounded card, x 72–1008, y 1407 to the bottom edge (bleeds off), top radius 44, wide framing centred on the face; the head breaks out above the card's top edge (§4.1) | y 0–1380, brand `bg` with a faint dot grid | word by word on the seam, `bottom` 0.335 | the *what*: names, definitions, structure, examples |
| `face` | full screen, punch-in pattern `[1.15, 1.25, 1.18]` on cuts | none | word by word at `captionsBottom` (0.21) | the *so what*: opinions, claims, payoffs, "It's called …" |
| `canvas` | hidden (audio continues) | full frame | seam position | at most 10% of the runtime: the hook proof collage, B-roll, one deliberate moment |

Layout switches are hard cuts on a word start. They're the main source of cuts; reframes happen only inside `face` segments.

## 2. Rules

`formats/explainer.json` declares `"rules": ["core", "explainer"]`. The explainer never takes a Motion or Talking-head rule; where it borrows one, its own rule says so. The full rules (X1–X8, plus the explainer note on R8) are in [MOTION_PHILOSOPHY.md](../MOTION_PHILOSOPHY.md#explainer-rules). In short:

- **X1.** `split` carries the what, `face` the so what. Face is 15–40% of the runtime; one face segment ≤ 9 s, one split segment ≤ 20 s.
- **X2.** One hero object (a contents list, timeline, loop, ladder or road) returns at every section start with the current item lit, and complete in a recap before the CTA.
- **X3.** Each canvas element enters on the word that names it. `maxGap` is 2.0.
- **X4.** Section changes inside the canvas are camera moves through one world, never dissolves.
- **X5.** Frame 0: the canvas title (≤ 12 words, with a number) builds in. By 5 s the framework gets a name on a face punch-in; by 8 s, the count.
- **X6.** A bold sans plus an italic serif (`fontAccent`) for the emotional phrase; numbers in the accent.
- **X7.** Original, light graphics, never labelled "example". Labels never re-type the sentence.
- **X8.** Soft sound, as T7.
- **R8 note.** The CTA title holds still once it lands; a preview of the deliverable may keep moving under it.

## 3. Format manifest: `formats/explainer.json`

```json
{
  "description": "Vertical split-screen explainer from raw footage: a motion-graphics canvas above, the speaker in a footage card below, full-face punch-ins for the lines that matter",
  "stages": ["00-brief", "01-references", "02-story", "03-source", "04-storyboard", "05-build", "06-qa", "07-render"],
  "checkpoints": { "02-story": "script.md", "03-source": "cuts.md", "04-storyboard": "storyboard.md", "07-render": "final.md" },
  "width": 1080, "height": 1920, "fps": 30,
  "maxGap": 2.0,
  "captions": "word",
  "rules": ["core", "explainer"],
  "captionsBottom": 0.21,
  "split": { "card": [72, 1407, 936, 513], "radius": 44, "seam": 0.335, "popOut": 0.2, "pattern": [1.15, 1.25, 1.18] },
  "faceShare": [0.15, 0.4],
  "speed": 1.0,
  "sfxPalette": "soft",
  "hold": 1.0
}
```

In `src/core/files.ts`, `Format` has the optional `split` and `faceShare` fields. `footageFirst(f)` (rules include `talking-head` or `explainer`) answers "is there a cut and a footage layer"; `talkingHead(f)` answers "do the T-rules apply".

## 4. Engine

- **Layout track.** `timeline.footage.layout` is `[{from, mode}]`, sorted, with the first entry at 0. `video.jsx` picks the mode per frame:
  - `face`: draws `Footage` full screen.
  - `split`: draws it inside the card rect with `objectFit: cover`. The object position follows the smoothed face centre from `face.json`, falling back to `50% 25%`.
  - `canvas`: skips it.

  `VideoContext` exposes `layout` so the other parts can follow it.
- **Layering.** Face footage is drawn under the scenes; the split card and the cut-out head are drawn over them, and the engine draws `GridGround` under split and canvas beats. Scenes therefore only draw the canvas.
- **`useLayout()`.** Returns `{ mode, canvas: {x,y,w,h}, card }` for the current frame, so scenes draw inside the canvas rect.
- **Captions.** With a layout track, `bottom` is the format's `seam` in `split` and `canvas`, and `captionsBottom` in `face`, switching on the same frame as the layout. The `emphasis` prop draws word ranges in `fontAccent` italic.
- **Face.** `faceAt` maps the face into the card rect in `split` mode. `Zone` (T4 overlays) works only in `face` mode; on other beats it draws nothing, so a scene can stay up across layout switches. `World` and `Canvas` likewise draw nothing on face beats.
- **Components** (generic, light, brand tokens only):
  - `GridGround`: the `bg` with a faint dot grid.
  - `World`: a world-space container. It eases between camera stops `[[t, x, y, zoom], …]`, with an optional `whip` stop that adds motion blur (X4).
  - `CanvasTitle`: sans plus italic-serif title lines, building word by word on cues. It can be re-titled per section.
  - `ContentsList`: a numbered list with the active item lit and the rest dimmed; the generic hero object. Bespoke hero objects such as a ladder or loop go in `scenes.jsx`.
  - `Tree` / `Node` / `Connector`: nodes and connectors that draw on cue times (e.g. Idea → Draft → Publish).
  - `DrawPath`: an SVG stroke drawn by progress, with glow (a road, a wave).
  - `Chips`: numbered bullets lighting up in turn.
  - `ProofCollage`: a grid of supplied or original thumbnails with count badges, never labelled "example" or "illustrative".
  - `DeliverablePreview`: stacked pages or a video card for the CTA.
- **Brand pack.** Optional `fontAccent` and `fontAccentFile` tokens. The default pack ships Instrument Serif Italic (SIL OFL, from Google Fonts) as `fontAccent`; a project pack can override it. Brands without the token fall back to the sans in bold italic.

### 4.1 Head break-out

The speaker's head rises above the card's top edge.

- **`agentic-video matte <slug>`** runs MediaPipe Image Segmenter (the selfie model) through the same runner as `face` (`$FACE_PY`, else `uv run --with mediapipe`). It writes `assets/cut-alpha.webm`: the cut with the person kept and everything else transparent (VP9 `yuva420p`, 720p, every frame). Because every frame is matted, changing the layout later never needs a new matte. Run it after `timeline`, then run `timeline` again so the split framing switches to the break-out.
  - The mask is smoothed over time (an exponential moving average over 3 frames) so edges don't flicker, then feathered by 2 px.
  - It runs sequentially at low priority with `-threads 1`, like `cut` and `face`. Expect about 1.2× real time on a 2-core machine (about 2,300 frames in roughly 90 s).
- **Card framing.** In `split` mode the card footage is positioned so that the top `popOut` fraction (default 0.2) of the head (hair top to chin) sits above the card's top edge, so the edge crosses about the eyebrows. At 0.35 it would cross the eyes. The position comes from `face.json`, smoothed.
- **Drawing.** In `split` mode `video.jsx` draws the card (clipped to its rounded rect), then `cut-alpha.webm` with the identical transform, clipped to the band from the head top down to the card's top edge plus its radius. Only the part of the head above the edge shows from the cutout; below it, the card footage is unchanged.
- **Captions** in `split` sit above the head: the seam line moves up when the head top would reach it, never down over the card.
- **Fallback.** Without a detector or `cut-alpha.webm`, the card frames the head fully inside it and `qa` warns.

## 5. Timeline (`agentic-video timeline`)

`cues.json` takes these explainer fields:

```json
{
  "layout": [[0, "canvas"], ["called-0.05", "face"], ["There", "split"], ["data", "face"], ["Number", "split"]],
  "cues": { "n1": "Number", "n2": ["Number", 2], "n3": ["Number", 3], "recap": "combination" },
  "hero": ["n1", "n2", "n3", "recap"],
  "emphasis": [["the", "real", "reason"]]
}
```

- `layout` refs resolve like other cues and snap to word starts. Each switch is an R3 event.
- `face` segments get the T2 reframe logic, using `split.pattern`, capped at the format's `maxGap` (2.0 s) with a 1.2–2.0 s window for the word start. `split` and `canvas` segments hold the card framing, so `cam` is 1 there.
- `hero` (cue names or words, like any time) and `emphasis` are resolved into the timeline for QA and captions.
- The report prints each layout segment with its first words, mode and length, and flags anything outside the X1 bounds.

## 6. Stage notes

- **`00-brief`:** the hero object idea, if the human has one, and the CTA deliverable.
- **`02-story`:** `script.md` is a table with these columns: beat, line, `what` / `so-what`, layout, canvas build (what appears on which word), hero state. It must have the hook claim, the framework name, the count, one example or analogy per item, a mid-video re-hook and a recap.
- **`03-source`:** same as talking-head (`keep.json` → `cut --preview` → checkpoint → `cut`). Recording notes for the human:
  - Frame chest up, head in the upper third, with room on both sides (the split card takes a 1.8:1 slice).
  - Record in 4K if possible, since the punch-ins go to 1.25.
  - Vertical 1080×1920 footage sits at about 0.87× in the card, so the head fills more of it than a wide studio frame would; the room around the head matters.
- **`04-storyboard`:** per beat, the layout, canvas build with cue words, camera stop and hero state. Before the checkpoint, a contact sheet of 8–14 style stills on the real footage, covering every layout and the CTA.
- **`06-qa`** stills review adds:
  - Any halo or flicker on the head's cut-out edge?
  - Is the canvas readable at phone size?
  - Is any panel boxed with an accent border?
  - Does a label re-type the sentence?
  - Is the face in the card centred and uncropped?

## 7. QA (`src/core/qa.ts`, explainer only)

- **Head break-out:** `assets/cut-alpha.webm` exists and covers every `split` frame (warn otherwise); the caption rect never intersects the head-top band in the stills sidecar.
- **X1:** face share inside `faceShare`; no face segment over 9 s; no split segment over 20 s; `canvas` ≤ 10% of the runtime.
- **X2:** every section (scene) before the CTA has a `hero` time; one `hero` time falls in the last 25% before the CTA (the recap). Warn if `cues.hero` is missing.
- **X5:** `hook.text` ≤ 12 words with a number (R1, R2); the first `face` segment starts by 5 s.
- **T5 / captions:** `captions.style` is `word`; footage layer present; A/V sync; every kept word captioned. These are the same checks as talking-head, behind `footageFirst`.
- **R3:** `maxGap` 2.0; layout switches count as events.
