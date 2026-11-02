# Usage: transcribe.py <audio-or-video> [model] [language]  ->  JSON [{t, s, e}] on stdout.
# Needs faster-whisper; runs locally, nothing is uploaded.
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
model = sys.argv[2] if len(sys.argv) > 2 else "base"
segments, _ = WhisperModel(model, device="cpu", compute_type="int8").transcribe(audio, word_timestamps=True, language=sys.argv[3] if len(sys.argv) > 3 else None)
print(json.dumps([{"t": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)} for s in segments for w in s.words]))
