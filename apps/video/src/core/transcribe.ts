// Word-level timings. Engines:
// - local (default): Whisper in Node (transformers.js) with Remotion's bundled
//   ffmpeg, so `npm install` is the only setup; $WHISPER_PY swaps in faster-whisper.
// - groq: Whisper large-v3 on Groq's API; uploads the audio. Default when
//   $GROQ_API_KEY is set. Better on non-English and mixed speech.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RenderInternals } from "@remotion/renderer";
import { root } from "./files.js";
import type { Word } from "./render.js";

/**
 * Decodes any audio or video file to 16 kHz mono float PCM. Remotion's ffmpeg
 * only has WAV and 16-bit PCM, so read that from stdout and skip to its data chunk.
 */
async function decode(file: string): Promise<Float32Array> {
  const { stdout } = await RenderInternals.callFf({
    bin: "ffmpeg",
    args: [
      "-v",
      "error",
      "-i",
      file,
      "-map_metadata",
      "-1",
      "-bitexact",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      "-f",
      "wav",
      "-",
    ],
    indent: false,
    logLevel: "error",
    binariesDirectory: null,
    cancelSignal: undefined,
    // Raw bytes, not text: execa returns a Buffer with encoding null.
    options: { encoding: null, maxBuffer: 1024 * 1024 * 1024 } as unknown as {
      encoding: string;
    },
  });
  const buf = stdout as unknown as Buffer;
  const data = buf.indexOf("data", 12) + 8;
  if (data < 8) throw new Error(`ffmpeg returned no audio for ${file}`);
  // The data size field is unset when writing to a pipe, so read to the end.
  const out = new Float32Array(Math.floor((buf.length - data) / 2));
  for (let i = 0; i < out.length; i++)
    out[i] = buf.readInt16LE(data + i * 2) / 32768;
  return out;
}

type Chunk = { text: string; timestamp: [number, number | null] };

async function transcribeNode(
  file: string,
  model: string,
  language?: string,
): Promise<Word[]> {
  const { pipeline } = await import("@huggingface/transformers");
  // The _timestamped exports carry the attention heads word timings need.
  const asr = await pipeline(
    "automatic-speech-recognition",
    `onnx-community/whisper-${model}_timestamped`,
    { dtype: "q8" },
  );
  const out = (await asr(await decode(file), {
    return_timestamps: "word",
    chunk_length_s: 30,
    // Without a language Whisper assumes English; "transcribe" stops it
    // translating other speech into English.
    ...(language ? { language, task: "transcribe" } : {}),
  })) as { chunks?: Chunk[] };
  const r = (n: number) => Math.round(n * 100) / 100;
  return (out.chunks ?? [])
    .filter((c) => c.text.trim())
    .map((c) => ({
      t: c.text.trim(),
      s: r(c.timestamp[0]),
      e: r(c.timestamp[1] ?? c.timestamp[0]),
    }));
}

/** Runs tools/transcribe.py with $WHISPER_PY when set; faster on long audio. */
function transcribePython(
  py: string,
  file: string,
  model: string,
  language?: string,
): Word[] {
  const out = execFileSync(
    py,
    [
      "-I",
      join(root, "tools", "transcribe.py"),
      file,
      model,
      ...(language ? [language] : []),
    ],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  return JSON.parse(out) as Word[];
}

/** Uploads 16 kHz mono MP3 (about 15 MB an hour, under Groq's 25 MB limit). */
async function transcribeGroq(
  file: string,
  key: string,
  model: string,
  language?: string,
): Promise<Word[]> {
  const tmp = mkdtempSync(join(tmpdir(), "agentic-video-"));
  try {
    const mp3 = join(tmp, "audio.mp3");
    await RenderInternals.callFf({
      bin: "ffmpeg",
      args: [
        "-v",
        "error",
        "-i",
        file,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "32k",
        mp3,
      ],
      indent: false,
      logLevel: "error",
      binariesDirectory: null,
      cancelSignal: undefined,
    });
    const form = new FormData();
    form.append(
      "file",
      new Blob([readFileSync(mp3)], { type: "audio/mpeg" }),
      "audio.mp3",
    );
    form.append("model", model);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    if (language) form.append("language", language);
    const res = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      },
    );
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    const { words = [] } = (await res.json()) as {
      words?: { word: string; start: number; end: number }[];
    };
    const r = (n: number) => Math.round(n * 100) / 100;
    return words
      .filter((w) => w.word.trim())
      .map((w) => ({ t: w.word.trim(), s: r(w.start), e: r(w.end) }));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export type Engine = "local" | "groq";

export async function transcribe(
  file: string,
  model = "base",
  language?: string,
  engine?: Engine,
): Promise<Word[]> {
  const key = process.env.GROQ_API_KEY;
  if ((engine ?? (key ? "groq" : "local")) === "groq") {
    if (!key)
      throw new Error(
        "--engine groq needs GROQ_API_KEY (in .env or the environment)",
      );
    // Local model names (base, small…) don't exist on Groq.
    return transcribeGroq(
      file,
      key,
      model.startsWith("whisper-") ? model : "whisper-large-v3",
      language,
    );
  }
  const py = process.env.WHISPER_PY;
  return py
    ? transcribePython(py, file, model, language)
    : transcribeNode(file, model, language);
}
