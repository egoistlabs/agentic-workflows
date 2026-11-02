# 05 Build

Build exactly what the approved storyboard says. Write plain JSX, not TypeScript.

## Talking-head

1. `agentic-video face <slug>`: tracks the speaker on `assets/cut.mp4` into `assets/face.json`. Without a detector it warns and zones use fixed boxes.
2. `agentic-video sfx <slug>`: the soft palette into `assets/sfx/`.
3. **`cues.json`** (the only timing you write):
   ```json
   {
     "cues": { "k4": "4,000", "honestly": ["honestly", 2] },
     "scenes": { "hook": 0, "intro": "Hey-0.08", "mirror": "tickets-0.5", "cta": "follow-0.12" },
     "overlayEvents": { "mirror": ["tickets", "shipped", "shipped+0.6"] },
     "pushes": [["honestly", "honestly+2.6", 1.0, 1.2]],
     "grade": [["boring", "fresh", 0]],
     "sfx": [["k4", "tap", 0.35]],
     "hook": { "text": "Invoice paid: $4,000", "show": false },
     "stop": ["like", "um"],
     "props": { "page": "…" }
   }
   ```
   A cue is a word in `assets/words-cut.json`, matched exactly (case-insensitive, punctuation ignored), with an occurrence when it appears more than once. A time is a cue name or a word, plus an optional offset (`"shipped+0.6"`). `hook.show: false` means a scene carries the payoff at frame 0.
4. `agentic-video timeline <slug>` writes `timeline.json`: footage layer, per-frame camera, events, SFX and captions. Read its output: every cue is printed next to the word it hit. Fix wrong hits and any R3 gaps it lists.
5. **`scenes.jsx`**: overlays only (the footage is drawn under every scene). Each scene receives `c` (cue times, absolute seconds) and the `props`. Wrap every overlay in a `Zone` with an `id`:
   ```jsx
   import { Zone, Ticket, useTime, pop, p } from '@engine';
   const Mirror = ({ c }) => {
     const { abs } = useTime(); // absolute video seconds
     const k = pop(abs, c.tickets);
     return (
       <Zone id="ticket" place="besideHead" width={320} from={c.tickets} to={c.shipped + 1}>
         <div style={{ opacity: k }}><Ticket id="DEV-1042" title="Fix login bug" status={abs < c.shipped ? 'To Do' : 'Done'} /></div>
       </Zone>
     );
   };
   export default { hook: Hook, mirror: Mirror, cta: Cta };
   ```
   `Zone` picks one spot clear of the face for the whole time the overlay is up and holds it there; it never follows the speaker. Pass that time as `from`/`to` (absolute seconds, e.g. `from={c.tickets} to={c.boring + 0.3}`); the default is the whole scene, which leaves less room. If QA says a zone is forced, the speaker moves too much in that span: shorten it or pick another place. `useFace()` gives the per-frame boxes if you need them. Don't render overlays when they are invisible (return null), so QA only checks what is on screen. No emoji (there is no emoji font): use text or SVG.

## Explainer

The footage pipeline is talking-head's, plus a layout track and the canvas.

1. `agentic-video face <slug>`, then `agentic-video sfx <slug>`.
2. **`cues.json`**: as talking-head, plus:
   ```json
   {
     "layout": [[0, "canvas"], ["called-0.05", "face"], ["There", "split"], ["data", "face"], ["Number", "split"], ["follow", "split"]],
     "hero": ["one", "two", "three", "recap"],
     "emphasis": [["Trust", "Expertise"]],
     "hook": { "text": "5 feedback habits that make teams faster", "show": false }
   }
   ```
   `layout` switches are hard cuts on a word start; the first applies from 0. `hero` lists the times the hero object shows (cue names or words). `emphasis` sets caption phrases in the accent serif. `hook.show: false`: the canvas title carries the payoff at frame 0. `popOut` (optional, format default 0.2) is the share of the head above the split card's edge; raise it (about 0.45) for a close-up take whose mouth falls off the card.
3. `agentic-video timeline <slug>`. It prints the layout segments with their first words, the face/split/canvas shares, and any X1 problem. Fix the layout before building scenes.
4. `agentic-video matte <slug>` cuts the speaker out (`assets/cut-alpha.webm`, a few minutes), then run `timeline` again: split cards are then framed so the head breaks out above the card's edge, and the caption seam moves up to clear it. Without a detector the card frames the whole head.
5. **`scenes.jsx`**: the canvas. On `split` and `canvas` beats the engine draws the dot-grid ground, and draws the footage card over the scenes, so scenes only draw inside `useLayout().canvas` (above the seam). Times are absolute: pass cue times straight in.
   ```jsx
   import { World, CanvasTitle, ContentsList, Tree, DrawPath, Chips, ProofCollage, DeliverablePreview, useLayout, useTime } from '@engine';
   const ITEMS = ['Ask early', 'Name the outcome', 'Close the loop'];
   const Body = ({ c }) => {
     const { abs } = useTime();
     const active = abs < c.two ? 0 : abs < c.three ? 1 : 2;
     return (
       <World stops={[[c.one, 540, 600, 1], [c.two, 540, 1500, 1], [c.three, 540, 2400, 1.1, { whip: true }]]}>
         <div style={{ position: 'absolute', left: 160, top: 300 }}><ContentsList items={ITEMS} active={active} at={c.one} /></div>
         <Tree nodes={[{ id: 'a', label: 'Idea', x: 540, y: 1400, at: c.idea }, { id: 'b', label: 'Draft', x: 840, y: 1600, at: c.draft, kind: 'accent' }]}
           edges={[{ from: 'a', to: 'b', at: c.draft }]} />
       </World>
     );
   };
   ```
   Components: `World` (camera stops, X4), `CanvasTitle` (`*phrase*` in the serif), `ContentsList` (the generic hero object), `Tree`, `DrawPath`, `Chips`, `ProofCollage` (supplied images or original placeholders; never set `example`), `DeliverablePreview` (the CTA's moving preview), `GridGround`, `Canvas`. Build bespoke hero objects (a ladder, a loop) in `scenes.jsx` from brand tokens. On `face` beats scenes may draw a `Zone` overlay; zones draw nothing on other beats.

## Motion formats

**`timeline.json`**
```json
{
  "width": 1080, "height": 1920, "fps": 30, "duration": 52,
  "audio": "vo.mp3",
  "words": "03-source/words.json",
  "hook": { "text": "…", "sub": "…", "until": 2.8 },
  "captions": { "style": "lower", "fix": { "heard": "correct" } },
  "scenes": [ { "id": "cold-open", "start": 0, "events": [0.4, 1.6, 2.8], "props": {} },
              { "id": "cta", "start": 46.5, "blend": 0.45 } ],
  "sfx": [ { "t": 0.4, "src": "sfx/click.wav", "volume": 0.5 } ]
}
```
- `duration` = audio length plus a 2–4 s CTA hold. `events` are seconds *within* the scene; QA checks them against R3.
- `audio`, `sfx` and image paths are relative to `../assets/`. Brand assets are under `assets/brand/`. `agentic-video sfx <slug>` makes a sound palette.

**`scenes.jsx`**: one component per scene id, default export `{ 'scene-id': Component }`.
```jsx
import { AbsoluteFill, KineticHeadline, ProofCard, useTime, enter, p } from '@engine';
const ColdOpen = () => {
  const { t } = useTime(); // seconds since this scene started
  return <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
    <KineticHeadline text="…" at={0.4} accent={['word']} />
  </AbsoluteFill>;
};
export default { 'cold-open': ColdOpen, cta: Cta };
```
- Use brand tokens through `useBrand()`, never hardcoded colours, so R6 holds.

## Both

- Everything is a pure function of time (`useTime`). No `Math.random`, `Date` or CSS animations.
- Check as you go: `agentic-video stills <slug> 0.5 3 8 …` and look at every PNG. Add `--safe-zone` to see the platform UI areas.

Set `stage:` to the next stage and log one line.
