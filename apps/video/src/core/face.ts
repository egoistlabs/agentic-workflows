// Speaker face tracking for talking-head videos: MediaPipe Face Landmarker on
// assets/cut.mp4 via tools/face.py ($FACE_PY, else `uv run --with mediapipe`).
// Without a detector, videos fall back to fixed overlay zones.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { findOnPath, videoDir, root } from "./files.js";

export type Box = [number, number, number, number];

export interface FaceFrame {
  t: number;
  face: Box;
  mouth: Box;
  /** The keep-out box (see keepOut). */
  keep: Box;
}

export interface FaceTrack {
  fps: number;
  width: number;
  height: number;
  frames: FaceFrame[];
}

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const SAMPLE_FPS = 5;

/**
 * The keep-out box for a face box: down past the chin by 40% of the face height
 * (a handheld mic) and up by 30% (hair; landmarks stop at the forehead).
 * engine/face.jsx uses the same formula.
 */
export const keepOut = ([x, y, w, h]: Box): Box => {
  const top = Math.max(0, y - h * 0.3);
  return [x, top, w, Math.min(1, y + h * 1.4) - top];
};

export const onPath = (name: string) => findOnPath(name) !== undefined;

/** How the detector would run here, or undefined when it can't. */
export function detector(): { cmd: string; args: string[] } | undefined {
  const py = process.env.FACE_PY;
  if (py) return { cmd: py, args: ["-I"] };
  if (onPath("uv"))
    return {
      cmd: "uv",
      args: [
        "run",
        "--quiet",
        "--no-project",
        "--with",
        "mediapipe",
        "--with",
        "opencv-python-headless",
        "python",
        "-I",
      ],
    };
  return undefined;
}

/** A MediaPipe model file, downloaded once into ~/.cache/agentic-video. */
export async function cachedModel(name: string, url: string): Promise<string> {
  const dir = join(
    process.env.XDG_CACHE_HOME ?? join(homedir(), ".cache"),
    "agentic-video",
  );
  const file = join(dir, name);
  if (existsSync(file)) return file;
  mkdirSync(dir, { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name} download failed: ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

type Raw = { t: number; face: Box | null; mouth: Box | null };

/** Fills missing samples by interpolation, then a centred 3-sample moving average. */
export function smooth(samples: Raw[]): { t: number; face: Box; mouth: Box }[] {
  const known = samples
    .map((s, i) => (s.face && s.mouth ? i : -1))
    .filter((i) => i >= 0);
  if (!known.length) return [];
  const filled = samples.map((s, i) => {
    if (s.face && s.mouth) return { t: s.t, face: s.face, mouth: s.mouth };
    const a = [...known].reverse().find((k) => k < i);
    const b = known.find((k) => k > i);
    const A = samples[a ?? b!]!;
    const B = samples[b ?? a!]!;
    const k = a !== undefined && b !== undefined ? (i - a) / (b - a) : 0;
    const lerp = (p: Box, q: Box) =>
      p.map((v, j) => v + (q[j]! - v) * k) as Box;
    return {
      t: s.t,
      face: lerp(A.face!, B.face!),
      mouth: lerp(A.mouth!, B.mouth!),
    };
  });
  const avg = (i: number, key: "face" | "mouth") => {
    const win = filled.slice(Math.max(0, i - 1), i + 2);
    return [0, 1, 2, 3].map(
      (j) =>
        Math.round(
          (win.reduce((s, f) => s + f[key][j]!, 0) / win.length) * 10000,
        ) / 10000,
    ) as Box;
  };
  return filled.map((f, i) => ({
    t: f.t,
    face: avg(i, "face"),
    mouth: avg(i, "mouth"),
  }));
}

/**
 * Writes assets/face.json for the video's cut. Returns undefined (and the reason)
 * when no detector is available; videos then use the fixed zones.
 */
export async function face(slug: string): Promise<{
  file?: string;
  frames: number;
  missing: number;
  reason?: string;
}> {
  const dir = videoDir(slug);
  const video = join(dir, "assets", "cut.mp4");
  if (!existsSync(video))
    throw new Error("assets/cut.mp4 is missing; run agentic-video cut first");
  const d = detector();
  if (!d)
    return {
      frames: 0,
      missing: 0,
      reason:
        "no face detector: set $FACE_PY to a Python with mediapipe, or install uv",
    };
  const task = await cachedModel("face_landmarker.task", MODEL_URL);
  const nice = process.platform !== "win32" && onPath("nice");
  const argv = [
    ...d.args,
    join(root, "tools", "face.py"),
    video,
    task,
    String(SAMPLE_FPS),
  ];
  const r = spawnSync(
    nice ? "nice" : d.cmd,
    nice ? ["-n", "19", d.cmd, ...argv] : argv,
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        OMP_NUM_THREADS: "1",
        TF_NUM_INTRAOP_THREADS: "1",
        TF_NUM_INTEROP_THREADS: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30 * 60 * 1000,
    },
  );
  if (r.status !== 0) {
    const err = (r.stderr || r.error?.message || "")
      .trim()
      .split("\n")
      .slice(-4)
      .join("\n");
    return { frames: 0, missing: 0, reason: `face detector failed: ${err}` };
  }
  const raw = JSON.parse(r.stdout) as {
    fps: number;
    width: number;
    height: number;
    samples: Raw[];
  };
  const frames = smooth(raw.samples).map((f) => ({
    ...f,
    keep: keepOut(f.face).map((v) => Math.round(v * 10000) / 10000) as Box,
  }));
  if (!frames.length)
    return {
      frames: 0,
      missing: raw.samples.length,
      reason: "no face found in the cut",
    };
  const track: FaceTrack = {
    fps: raw.fps,
    width: raw.width,
    height: raw.height,
    frames,
  };
  const file = join(dir, "assets", "face.json");
  writeFileSync(file, JSON.stringify(track));
  return {
    file,
    frames: frames.length,
    missing: raw.samples.filter((s) => !s.face).length,
  };
}
