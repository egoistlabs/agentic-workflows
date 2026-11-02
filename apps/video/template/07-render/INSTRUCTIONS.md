# 07 Render

1. `agentic-video render <slug>` → `<slug>.mp4` here. It normalises the audio to −14 LUFS (−1.5 dBTP) as a final audio-only pass and records the loudness in `06-qa/qa.md`.
2. Write `caption.md`: the post caption (hook line, two lines of value, the CTA), within the brief's claim limits, written for the platform in the brief. Use only the page or handle names the brief gives; never guess one.
3. Write `final.md`: video path, duration, QA result, loudness, and anything the human should check while watching.
4. CHECKPOINT: give the human the video path and stop. Record each reusable piece of their feedback with `agentic-video learn <slug> "…"`. After approval add `approved: yes` to `final.md`, set `stage: done`, and offer `agentic-video publish <slug>`.
