# 03 Source

Get timed source material. Nothing here is creative.

**VO-driven (motion-reel):**
1. Wait for the recording. If it is not in `../assets/`, ask the human for it and stop.
2. `agentic-video transcribe ../assets/<vo> words.json --language <code from the brief>`. With `GROQ_API_KEY` set it uses Groq (best for non-English and mixed speech such as Spanglish, Hinglish or Taglish) and uploads the audio, so confirm the human is fine with that first; `--engine local` keeps it local. Locally, the first run downloads the model; for non-English or mixed speech start with `--model small`, and try `medium` if words are still wrong.
3. Compare `words.json` with the approved script. List misheard words in `fix.json` (`{"heard": "correct"}`) for captions. Note any lines that were cut or changed in `notes.md`.

**Raw footage (talking-head, explainer):**

Explainer recording notes for the human: frame from the chest up with the head in the upper third and room on both sides (the split card shows a wide slice); a plain, darker background separates best for the head break-out; record in 4K if possible, since face beats punch in to 1.25×.
1. Transcribe the clip into `words.json`, with `--language` and `--model` as above. List misheard words in `fix.json`.
2. `agentic-video silences <slug> assets/<clip>` lists the pauses (cached in `silences.json`).
3. Write `keep.json`, the keep list as beats of word-index ranges into `words.json`:
   ```json
   { "clip": "assets/<clip>", "keep": [ { "beat": "hook", "from": 20, "to": 35 }, { "beat": "intro", "from": 36, "to": 52 } ] }
   ```
   One core line per beat; drop retakes, false starts and connective filler. `start`/`end` (source seconds) override an edge only when snapping gets it wrong.
4. Write `cuts.md`: each beat with its quote, and every cut with its quote and reason.
5. `agentic-video cut <slug> --preview` renders `rough-cut.mp4` (540p). Edges snap out to the real silence edges, bounded by the neighbouring cut words, and pauses over 0.25 s inside a beat are removed. Watch it yourself first.
6. CHECKPOINT: show the human `cuts.md` and `03-source/rough-cut.mp4`, and stop. After approval add `approved: yes` to `cuts.md`.
7. `agentic-video cut <slug>` renders the full cut into `assets/`: `cut.mp4`, `cut-audio.wav`, `cut-last.png`, `words-cut.json`, `edl.json`, `cut-map.json`. It fails if audio and video differ by more than 0.05 s.

Heavy ffmpeg work runs one job at a time at low priority. Don't start another render while a cut runs.

Set `stage:` to the next stage and log one line.
