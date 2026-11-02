# 06 QA

1. Render stills at every scene start + 0.5 s, every hook frame (0, 1, 2 s), each overlay's key moment and the CTA: `agentic-video stills <slug> … --safe-zone`. Stills also record every `Zone` and caption box in `zones.json`.
2. Run `agentic-video qa <slug>`. It writes `qa.md` and checks R1, R2, R3, R5, R8 and the audio length; for talking-head and explainer also captions style, the footage layer, A/V sync, that every kept word is captioned, and that no overlay touches the face keep-out box; for explainer also the layout shares and segment lengths (X1), hero returns and the recap (X2), the hook and first face beat (X5), and the head break-out. It also checks caption contrast and emoji. Warnings need a look; fails send you back.
3. Look at each still and add a **Review** section to `qa.md`, one line per still:
   - Is text readable at phone size, and out of the shaded safe zones?
   - Is the named object on screen when the VO names it?
   - Is there one focal point? Did old emphasis clear?
   - Do brand colours and type hold (R6, T6 for talking-head, X6 for explainer)?
   - Does the video follow every project learning?
   - **Talking-head:** Anything over the mouth, chin or mic? Does any overlay restate the caption? Is it a native, light element? Is it in a T4 zone (beside or above the head, below the chin)? Does it match any **Rejected looks**?
   - **Explainer:** Is the canvas readable at phone size? Any panel boxed with an accent border? Does a label re-type the sentence? Is the face centred and uncropped in the card? Any halo or flicker on the head's cut-out edge? Is the caption clear of the head?
4. If a failure is one that could recur in future videos, add it with `agentic-video learn <slug> "…"`.
5. Any fail sends you back to `05-build`: set `stage: 05-build`, log what failed, fix it, then come back. To clear old stills, delete them by explicit path (`rm .videos/<slug>/06-qa/stills/t001.0.png …`), not with a glob in a `cd`'d command.

When the checks pass and the review is clean, set the next stage and log one line.
