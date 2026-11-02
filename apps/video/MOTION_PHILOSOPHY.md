# Motion philosophy

These are the craft rules every video follows. They come from studying high-performing short videos and from videos approved at the final checkpoint. A rule stays here only while the evidence holds. A hypothesis becomes a rule once 3 or more videos across 2 or more formats support it.

The brand pack decides how things look. These rules decide how attention is held.

Rules come in groups. Each format declares the groups that apply (`formats/*.json` → `"rules"`), and `route` prints them:

| Group | Formats |
| --- | --- |
| **Core** | all |
| **Motion** | motion-reel, launch, showreel |
| **Talking-head** | talking-head |
| **Explainer** | explainer |

A talking-head video never takes a Motion rule, and a motion video never takes a Talking-head rule. An explainer takes only its own group: where it borrows a Talking-head rule, the Explainer rule says so. Read **Rejected looks** at the end before any storyboard.

Lessons from one project stay in that project's `learnings.md`. Only the maintainer promotes one into a group here, with `agentic-video learn <slug> --promote "<lesson>"`; it lands at the end of the group as a **Promoted** line naming its project and date.

## Core rules (all formats)

### R1. The payoff is legible at frame 0
Frame 0 shows the claim, the result or the problem, before any motion or VO lands. It can be carried by a hook title, a caption, or a native element in the scene (a notification showing the amount). An image-only cold open can sit behind it, but never replaces it.
- **Script (02):** write a `hook.text` of 12 words or fewer that someone could repeat to a friend.
- **QA (06):** `timeline.json` has `hook.text`, and either the hook title is visible from frame 0 to at least 2.5 s, or `hook.show` is `false` and the scenes carry it (the stills review confirms frame 0).

### R2. Lead with a specific number or a counted promise
A count, an amount, a timeframe or a numbered structure ("3 steps", "4 mistakes") makes the payoff concrete. Only use numbers the brief can support. Never invent results.
- **Script (02):** the hook, or the first VO sentence, contains a number. If the brief has no true number, use a counted structure.

### R3. Something new every 1.3–3 seconds
A cut, a reframe, a new element, a diagram step, a camera move or a caption keyword. A continuous build counts. A static hold longer than 3 s counts only as the final CTA hold.
- **Storyboard (04):** every beat lists its `events` (seconds when something new appears). Talking-head: `agentic-video timeline` generates them from cuts, reframes and overlay events.
- **QA (06):** a gap longer than the format's `maxGap` between events fails, except inside the CTA hold.

### R5. Word-synced captions on all speech
Captions follow word timings, never sentence blocks. Use one style per video:
- `lower`: 1–4 words, lower third, calm. The default for teaching.
- `keyword`: one big keyword with the filler words small. For high-energy motion pieces.
- `word`: every word, one at a time; key words big, filler small, numbers in the accent. The talking-head style (T5).

Captions stay clear of the platform UI safe zones.
- **Engine:** `Captions`.

### R8. End on one action, held still
The last 3–5 s show a single CTA, with no new motion after it lands and nothing competing with it.
- **QA (06):** the `cta` beat exists, ends at the video end, and is at least 3 s long.
- **Explainer:** the action (the CTA title) holds still once it lands; a preview of the deliverable may keep moving under it, because it shows what the viewer gets.

## Motion rules (motion-reel, launch, showreel)

### R1m. Hook title box
The payoff sits in a hook title (`HookTitle`) from frame 0 to at least 2.5 s.

### R4. Show receipts
Leave the face or mascot for evidence: a real screenshot, a UI, a document, a diagram of the actual mechanism. Invented examples are never labelled "example" or "illustrative". Keep them generic: no real company or person, and only numbers from the brief or the story bank (the creator's own true stories and numbers; see [agentic-smm](../smm/README.md)). In motion and launch pieces the real product UI is the hero.
- **Storyboard (04):** each claim beat names its proof asset or diagram.
- **Engine:** `ProofCard`.

### R6. One accent colour on a neutral ground
Dark or near-white background, one brand accent, light as glow or gradient, and one clean sans family. A second colour is only for state (error/success).
- **Brand pack:** `tokens.accent`, `tokens.bg`, `tokens.fg`, `tokens.font`.

### R7. Kinetic type carries meaning
Headlines build word by word, on the VO's beat when there is VO, or on the music when there isn't. Only the word being said or landing is at full strength.
- **Engine:** `KineticHeadline`.

## Talking-head rules

### T1. Footage first
The speaker is on screen for at least 90% of the runtime and never gone for more than 3.5 s. No full-screen cards, except one deliberate moment.
- **Engine:** the timeline's `footage` layer sits under every scene; scenes draw overlays only.

### T2. Reframes are the cut
Every jump cut changes framing: wide (1.0), medium (about 1.08), tight (about 1.18), centred on the face. Long segments get a reframe on a word boundary roughly every 2.6 s. Emotional lines get a slow push instead of overlays.
- **Build (05):** `agentic-video timeline` writes the per-frame camera from the cut map; `cues.json` declares pushes and grades.

### T3. Act it out, don't label it
An overlay shows the example, the consequence or the change of state, never the same words as the caption. "Same inbox every morning" becomes identical notifications stacking; "boring" becomes the frame going black and white.
- **Storyboard (04):** each overlay names its **line → action → zone**, and a duplication audit confirms no overlay repeats the caption.

### T4. Native and light
Overlays look like real UI: an iOS notification, a ticket card, a social post, a browser card, a follow button, a polaroid with a real logo. They are small, on the wall beside the head, and never over the mouth, chin or mic. Each one is placed once and holds still while it is up: an overlay that follows the speaker around reads as glitchy. No dark boxes with accent borders.
- **Engine:** `Notification`, `NotificationStack`, `NativeCard`, `Ticket`, `SocialPost`, `BrowserCard`, `ApplyButton`, `Polaroid`, `FollowPill`, each placed with `Zone`.
- **QA (06):** no `Zone` rect intersects the face keep-out box.

### T5. Captions word by word
At the bottom, readable on any clothing (stroke and shadow). Every word appears, not keywords only.
- **QA (06):** `captions.style` is `word`.

### T6. Brand as accent
The accent colour goes on numbers in captions and on highlights only. Brand panels are not used over footage. From a web brand pack, use only the accent and the font.

### T7. Soft sound
Taps, dry clicks, a quiet notification chime, and a whoosh only on a real move. No pitch-drop plops, thumps or stamps. The voice stays dominant (SFX at 0.25–0.35 under it).
- **Tool:** `agentic-video sfx <slug>` (the format's `soft` palette).

### T8. One open loop with a callback
Plant an object in the hook and resolve it with a visible state change at the payoff ($4,000 → a blurred balance).
- **Storyboard (04):** name the open-loop object, where it is planted and where it pays off.

## Explainer rules

The split-screen explainer: a motion-graphics canvas above, the speaker in a footage card below, full-face punch-ins for the lines that matter. Each beat takes one layout: `split`, `face` or `canvas`. Format reference: [specs/explainer-format.md](specs/explainer-format.md).

### X1. Two layouts, one job each
`split` carries the what: names, definitions, structure, examples. `face` carries the so what: opinions, claims, payoffs. Every face segment lands on a judgement line. Face is 15–40% of the runtime, so the speaker builds trust without hiding the structure; one face segment lasts at most 9 s, one split segment at most 20 s; `canvas` is at most 10%.
- **Script (02):** each line is tagged `what` or `so-what`, with its layout.
- **QA (06):** face share and segment lengths from `footage.layout`.

### X2. One hero object, which returns
The list or steps live on one visual metaphor (a contents list, timeline, loop, ladder or road). It appears at every section start with the current item lit, and complete in a recap before the CTA. It works as a progress marker, so viewers know how far along they are.
- **Storyboard (04):** name the hero object, every return and the recap.
- **QA (06):** `cues.hero` has a time in every section and one in the last 25% before the CTA.

### X3. Builds on the word
Each canvas element (node, chip, label, stroke) enters on the cue of the word that names it. Pace comes from builds, so long split shots are fine.
- **Format:** `maxGap` 2.0.

### X4. One world, the camera travels
Section changes inside the canvas are camera moves through one world (`World`): a pan along, a push into the item, a whip-zoom onto a number. Canvas scenes never dissolve into each other: one continuous space is easier to follow than a slideshow.

### X5. Claim, name, count
Frame 0: the canvas title (12 words or fewer, with a number) builds in word by word over the hero object or a proof collage, on the canvas, never boxed over the face. By 5 s the framework gets a name ("It's called …") on a face punch-in; by 8 s, the count. A named, counted framework tells viewers what they will get and keeps them to the end.
- **QA (06):** the first face segment starts by 5 s.

### X6. Two typefaces, one accent
A bold sans plus an italic serif (`fontAccent`) for the emotional phrase in titles. Captions run word by word (as T5): on the seam in `split`, at the bottom in `face`. Phrases in `cues.emphasis` swap to the italic serif instead of a colour; numbers stay in the accent (T6). The accent is light (strokes, glow, the active state) on the `bg` dot grid; a second colour is only for state.

### X7. Original, light graphics
Diagrams and mocks are original. Invented examples are never labelled "example" or "illustrative". Keep them generic: no real company or person, and only numbers from the brief or story bank. Labels may name the item but never re-type the spoken sentence. No dark panels with accent borders, no decorative chips. Another creator's thumbnails or footage appear only when the human supplies them.

### X8. Soft sound
As T7: taps, clicks, and a whoosh only on a real camera move, under the voice.

## Rejected looks

These looks read as generic and machine-made. Check every storyboard and every still against them.

- A boxed hook title over a talking head.
- Dark panels with accent borders over bright footage (they read as heavy boxes on a white shirt).
- Proof cards that restate what the speaker is saying.
- Keyword-only captions that skip most of the words.
- A decorative brand chip or badge with no job.
- Graphics that push the speaker off screen or cover the face, mouth or mic.
- Pitch-drop plops, thumps and stamps on every element.
- Overlays that track the speaker's movement and jump around with it.
- Website CSS tokens used as motion styling.

## Hypotheses (try them, measure them, don't enforce them)

- **H1. Personal stakes beat polish.** For talking-head pieces, real context (the speaker's own setting and work) and their natural way of speaking outperform studio polish.
- **H2. Progress marker.** Promoted to X2 for explainers. Still a hypothesis for talking-head.
- **H3. Mascot bookends.** The mascot or narrator opens and closes, and proof owns the middle.
- **H4. Series hook in the CTA.** End by promising the next part.
- **H5. Story reels are mixed louder.** Check integrated LUFS against the format default (−14).
