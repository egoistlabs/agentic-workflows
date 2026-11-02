// Runs ffmpeg/ffprobe gently on small machines: low priority, a timeout, and
// one process at a time. Remotion's bundled build is the default; it is slim
// (no select/setpts/fps/drawtext/tile/aevalsrc), so commands that need those
// ask for the "full" build: $FFMPEG, else ffmpeg on PATH.
import { spawnSync } from "node:child_process";
import { RenderInternals } from "@remotion/renderer";
import { findOnPath } from "./files.js";

const bundled = (type: "ffmpeg" | "ffprobe") => {
  const p = RenderInternals.getExecutablePath({
    type,
    indent: false,
    logLevel: "error",
    binariesDirectory: null,
  });
  RenderInternals.makeFileExecutableIfItIsNot(p);
  return p;
};

const onPath = findOnPath;

/** The full ffmpeg build, or undefined when only the bundled one exists. */
export function fullFfmpeg(): string | undefined {
  return process.env.FFMPEG || onPath("ffmpeg");
}

export function ffmpegBin(full = false): string {
  if (!full) return bundled("ffmpeg");
  const p = fullFfmpeg();
  if (!p)
    throw new Error(
      "this needs a full ffmpeg build (install ffmpeg, or set $FFMPEG to one)",
    );
  return p;
}

const nice = process.platform !== "win32" && !!onPath("nice");

export interface RunOptions {
  /** Seconds before the process is killed. Default 300. */
  timeout?: number;
  /** Show ffmpeg's own output (progress) instead of capturing it. */
  inherit?: boolean;
}

/** Runs a binary at low priority; throws with its stderr on failure. */
export function run(bin: string, args: string[], o: RunOptions = {}): string {
  const [cmd, argv] = nice ? ["nice", ["-n", "19", bin, ...args]] : [bin, args];
  const r = spawnSync(cmd, argv, {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    timeout: Math.round((o.timeout ?? 300) * 1000),
    killSignal: "SIGKILL",
    stdio: o.inherit
      ? ["ignore", "inherit", "inherit"]
      : ["ignore", "pipe", "pipe"],
  });
  if (r.error) throw r.error;
  if (r.signal)
    throw new Error(`${cmd} killed (${r.signal}) after ${o.timeout ?? 300}s`);
  if (r.status !== 0)
    throw new Error(
      `${bin.split("/").pop()} failed: ${(r.stderr ?? "").trim().split("\n").slice(-6).join("\n")}`,
    );
  // ffmpeg reports filters (silencedetect, loudnorm) on stderr.
  return `${r.stdout ?? ""}${r.stderr ?? ""}`;
}

/** ffmpeg with -nostdin -y, quiet unless `inherit`. */
export const ffmpeg = (
  args: string[],
  o: RunOptions & { full?: boolean } = {},
) => run(ffmpegBin(o.full), ["-nostdin", "-y", "-hide_banner", ...args], o);

export const ffprobeBin = () => bundled("ffprobe");

/** Duration in seconds of a file, or of its first stream of a type. */
export function probeDuration(file: string, stream?: "v" | "a"): number {
  const args = stream
    ? ["-select_streams", `${stream}:0`, "-show_entries", "stream=duration"]
    : ["-show_entries", "format=duration"];
  const out = run(
    ffprobeBin(),
    ["-v", "error", ...args, "-of", "csv=p=0", file],
    { timeout: 60 },
  );
  const d = Number(out.trim().split("\n")[0]);
  if (!Number.isFinite(d)) throw new Error(`no duration for ${file}`);
  return d;
}

/** Frame rate and start time of a file's first video stream. */
export function probeVideo(file: string): {
  fps: number;
  start: number;
  width: number;
  height: number;
} {
  const out = run(
    ffprobeBin(),
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=r_frame_rate,start_time,width,height",
      "-of",
      "json",
      file,
    ],
    { timeout: 60 },
  );
  const s = (JSON.parse(out) as { streams: Record<string, string | number>[] })
    .streams[0];
  if (!s) throw new Error(`${file} has no video stream`);
  const [n, d] = String(s.r_frame_rate).split("/").map(Number);
  return {
    fps: n! / (d || 1),
    start: Number(s.start_time) || 0,
    width: Number(s.width),
    height: Number(s.height),
  };
}
