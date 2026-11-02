// Speaker cut-out for the explainer head break-out (§6.1 of the explainer spec):
// MediaPipe's selfie segmenter on assets/cut.mp4 via tools/matte.py, merged as the
// alpha of a 720p VP9 webm (assets/cut-alpha.webm) plus its last frame as a PNG.
// The engine draws it over the footage card's top edge. Every frame is matted, so
// layout changes never need a new matte.
import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { cachedModel, detector, onPath } from "./face.js";
import { ffmpeg, ffmpegBin, probeVideo } from "./ff.js";
import { root, videoDir } from "./files.js";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
/** Matte width in px; the card shows the head at about this scale. */
const WIDTH = 720;

export interface MatteResult {
  file?: string;
  last?: string;
  frames?: number;
  reason?: string;
}

/** Runs segmenter | ffmpeg as one pipeline at low priority; resolves with the segmenter's last stderr line. */
function pipeline(
  seg: string[],
  enc: string[],
  timeout: number,
): Promise<string> {
  const nice = process.platform !== "win32" && !!onPath("nice");
  const start = (cmd: string[], env?: NodeJS.ProcessEnv) =>
    spawn(nice ? "nice" : cmd[0]!, nice ? ["-n", "19", ...cmd] : cmd.slice(1), {
      env: env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
  const a = start(seg, {
    ...process.env,
    OMP_NUM_THREADS: "1",
    TF_NUM_INTRAOP_THREADS: "1",
    TF_NUM_INTEROP_THREADS: "1",
  });
  const b = start(enc);
  a.stdout.pipe(b.stdin);
  let aErr = "";
  let bErr = "";
  a.stderr.on("data", (d: Buffer) => {
    aErr += d;
    const line = String(d).trim().split("\n").pop();
    if (line && /frames/.test(line)) process.stderr.write(`matte: ${line}\n`);
  });
  b.stderr.on("data", (d: Buffer) => (bErr = (bErr + d).slice(-4000)));
  const timer = setTimeout(
    () => (a.kill("SIGKILL"), b.kill("SIGKILL")),
    timeout * 1000,
  );
  const done = (p: typeof a) =>
    new Promise<number>((res) => p.on("close", (code) => res(code ?? 1)));
  return Promise.all([done(a), done(b)]).then(([ca, cb]) => {
    clearTimeout(timer);
    if (ca !== 0)
      throw new Error(
        `segmenter failed: ${aErr.trim().split("\n").slice(-4).join("\n")}`,
      );
    if (cb !== 0)
      throw new Error(
        `ffmpeg failed: ${bErr.trim().split("\n").slice(-4).join("\n")}`,
      );
    return aErr.trim().split("\n").pop() ?? "";
  });
}

/**
 * Writes assets/cut-alpha.webm and assets/cut-alpha-last.png. Returns a reason
 * instead when no detector is available; the card then frames the whole head.
 */
export async function matte(slug: string): Promise<MatteResult> {
  const dir = videoDir(slug);
  const video = join(dir, "assets", "cut.mp4");
  if (!existsSync(video))
    throw new Error("assets/cut.mp4 is missing; run agentic-video cut first");
  const d = detector();
  if (!d)
    return {
      reason:
        "no segmenter: set $FACE_PY to a Python with mediapipe, or install uv",
    };
  const model = await cachedModel("selfie_segmenter.tflite", MODEL_URL);
  const { width, height, fps } = probeVideo(video);
  const h = Math.round((height * WIDTH) / width / 2) * 2;
  const file = join(dir, "assets", "cut-alpha.webm");
  const last = join(dir, "assets", "cut-alpha-last.png");
  rmSync(file, { force: true });
  rmSync(last, { force: true });
  const full = ffmpegBin(true);
  const summary = await pipeline(
    [
      d.cmd,
      ...d.args,
      join(root, "tools", "matte.py"),
      video,
      model,
      String(WIDTH),
    ],
    [
      full,
      "-nostdin",
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      video,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "gray",
      "-s",
      `${WIDTH}x${h}`,
      "-r",
      String(fps),
      "-i",
      "pipe:0",
      "-filter_complex",
      `[0:v]scale=${WIDTH}:${h},format=yuva420p[v];[1:v]format=gray[m];[v][m]alphamerge,format=yuva420p`,
      "-an",
      "-c:v",
      "libvpx-vp9",
      "-pix_fmt",
      "yuva420p",
      "-b:v",
      "0",
      "-crf",
      "30",
      "-deadline",
      "realtime",
      "-cpu-used",
      "8",
      "-row-mt",
      "1",
      "-threads",
      "1",
      file,
    ],
    60 * 60,
  );
  // libvpx-vp9 must decode it, or the alpha plane is dropped.
  ffmpeg(
    [
      "-c:v",
      "libvpx-vp9",
      "-sseof",
      "-0.2",
      "-i",
      file,
      "-update",
      "1",
      "-frames:v",
      "1",
      last,
    ],
    { full: true, timeout: 120 },
  );
  return {
    file,
    last,
    frames: Number(summary.match(/^(\d+) frames/)?.[1] ?? 0),
  };
}
