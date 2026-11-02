# 04 Storyboard

Write `storyboard.md`: the plan `05-build` will follow exactly, aligned to the real recording.

Follow the project learnings `route` prints, and check the plan against **Rejected looks** in `MOTION_PHILOSOPHY.md`.

## Motion formats

One block per beat:

```
## <scene-id>  <start>–<end>s   (VO: "first words…")
Layout: what is where (1080×1920; keep text out of the safe zone: top 8%, bottom 18%, right 13% from 40% down)
Carried object: what enters from the previous beat and what leaves to the next
Events: <seconds into the scene when something new appears>   (R3: no gap > 3 s)
Proof: <asset file or diagram>   (R4)
Motion: entrances, camera move, exit
SFX: <time> <sound>
```

- Take start times from `03-source/words.json`. An object named in the VO is on screen by the start of the phrase that names it.
- Reuse engine components: `KineticHeadline`, `ProofCard`, `ProgressMarker`, `Sprite`, `Captions` (automatic). Name them in Layout.

## Talking-head

Times are on the cut (`assets/words-cut.json`). The speaker is on screen the whole time (T1); the camera reframes on every cut (T2). Write:

- **Global:** the reframe pattern, captions (`word`, bottom), the grade moments, the SFX palette (soft), and **the open-loop object**: what is planted in the hook, and the visible state change that pays it off (T8).
- **One block per beat:**
  ```
  ## <scene-id>  <start>–<end>s   ("first words…")
  Overlay: <line> → <action> → <zone>     e.g. "same inbox every morning" → identical notification banners stack → aboveHead
  Camera: reframes, or a slow push on an emotional line (instead of an overlay)
  SFX: <word> <tap|click|chime|swish>
  ```
  Overlays are native, light UI (`Notification`, `NotificationStack`, `Ticket`, `SocialPost`, `BrowserCard`, `ApplyButton`, `Polaroid`, `FollowPill`) in a zone: `besideHead`, `aboveHead` or `belowChin`. A beat may have no overlay.
- **Duplication audit:** a table of every overlay and the caption words at that moment. No overlay may repeat the caption text (T3). Fix any that do.
- **Style stills (before the checkpoint):** write rough `05-build/cues.json` and `05-build/scenes.jsx` for the key moments, run `agentic-video face <slug>` and `agentic-video timeline <slug>`, then render 6–13 stills on the real footage: `agentic-video stills <slug> <t…> --sheet`. Look at every still against T4 and Rejected looks. The storyboard is approved from the stills, not from text.

## Explainer

Times are on the cut (`assets/words-cut.json`). Write:

- **Global:** the hero object and how it looks (X2), the world it lives in and the camera stops between sections (X4), the title line with its `*serif phrase*` (X6), captions (`word`, on the seam in split), the SFX palette (soft), and the layout shares (X1: face 15–40%).
- **One block per beat:**
  ```
  ## <scene-id>  <start>–<end>s   ("first words…")
  Layout: face | split | canvas, switching on "<word>"
  Canvas: <element> → "<word>", <element> → "<word>"   (X3: each element on the word that names it)
  Hero: state (which item is lit), or recap
  Camera: World stop (pan / push / whip) on "<word>"
  Emphasis: "<phrase>" in the serif
  SFX: <word> <tap|click|swish>
  ```
  Face beats may carry one T4-style overlay in a `Zone`; most carry none.
- **Rejected looks audit:** no dark panels with accent borders, no label that re-types the sentence, original graphics only (X7).
- **Style stills (before the checkpoint):** write rough `05-build/cues.json` and `05-build/scenes.jsx`, run `face`, `timeline`, `matte`, `timeline` (05-build), then render 8–14 stills covering every layout, a hero return, the recap and the CTA: `agentic-video stills <slug> <t…> --sheet`.

Scene ids are kebab-case, and the last one is `cta`. List assets that don't exist yet under **Missing assets** and ask the human for them.

CHECKPOINT: show the human the storyboard **and the contact sheet** (`06-qa/stills/sheet.png`), and stop. After approval, add `approved: yes` and set the next stage.
