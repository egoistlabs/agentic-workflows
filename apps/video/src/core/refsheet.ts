// Reference contact sheets: timestamped frame grids plus scene-cut times, so a
// teardown can read a reference video at a glance. Needs the full ffmpeg build.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { ffmpeg, probeDuration } from "./ff.js";
import { videoDir } from "./files.js";

const isUrl = (s: string) => /^https?:\/\//i.test(s);

/** A short folder name from a file name or URL. */
export const refName = (src: string) =>
  (isUrl(src)
    ? (new URL(src).pathname.split("/").filter(Boolean).pop() ??
      new URL(src).hostname)
    : basename(src, extname(src))
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "ref";

function download(url: string, out: string): string {
  const r = spawnSync(
    "uvx",
    [
      "yt-dlp",
      "--quiet",
      "--no-playlist",
      "-f",
      "mp4/best",
      "-o",
      join(out, "source.%(ext)s"),
      url,
    ],
    {
      stdio: ["ignore", "inherit", "inherit"],
      timeout: 10 * 60 * 1000,
    },
  );
  if (r.error) throw new Error(`yt-dlp needs uv (uvx): ${r.error.message}`);
  if (r.status !== 0) throw new Error(`yt-dlp could not download ${url}`);
  const file = readdirSync(out).find((f) => f.startsWith("source."));
  if (!file) throw new Error("yt-dlp wrote no file");
  return join(out, file);
}

export function refsheet(
  slug: string,
  src: string,
  o: { fps?: number; name?: string; threshold?: number } = {},
): { dir: string; sheets: string[]; cuts: number[] } {
  const name = o.name ?? refName(src);
  const out = join(videoDir(slug), "01-references", name);
  mkdirSync(out, { recursive: true });
  const file = isUrl(src) ? download(src, out) : resolve(src);
  if (!existsSync(file)) throw new Error(`${src} not found`);
  const fps = o.fps ?? 1;

  // 7×5 grids of 216 px frames, each stamped with its time.
  const stamp =
    "drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4";
  ffmpeg(
    [
      "-v",
      "error",
      "-threads",
      "1",
      "-i",
      file,
      "-vf",
      `fps=${fps},scale=216:-1,${stamp},tile=7x5`,
      "-fps_mode",
      "vfr",
      join(out, "sheet%02d.png"),
    ],
    {
      full: true,
      timeout: 600,
    },
  );
  const sheets = readdirSync(out)
    .filter((f) => /^sheet\d+\.png$/.test(f))
    .sort();

  // Jump cuts on the same speaker score ~4–13; scdet's default (10) only catches scene changes.
  const t = o.threshold ?? 4;
  const log = ffmpeg(
    [
      "-threads",
      "1",
      "-i",
      file,
      "-an",
      "-vf",
      `scale=270:-2,scdet=t=${t}`,
      "-f",
      "null",
      "-",
    ],
    { full: true, timeout: 600 },
  );
  const hits = [
    ...log.matchAll(/lavfi\.scd\.score: ([\d.]+), lavfi\.scd\.time: ([\d.]+)/g),
  ].map((m) => ({
    t: Math.round(Number(m[2]) * 100) / 100,
    score: Number(m[1]),
  }));
  const cuts = hits.map((h) => h.t);
  const dur = probeDuration(file);
  const gaps = [0, ...cuts, dur]
    .slice(1)
    .map((t, i) => t - ([0, ...cuts][i] ?? 0));
  const avg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : dur;
  writeFileSync(
    join(out, "cuts.md"),
    `# ${name}: scene cuts\n\nSource: ${src}\nDuration: ${dur.toFixed(1)}s, ${cuts.length} cuts, one every ${avg.toFixed(1)}s on average.\n` +
      `Sheets: ${sheets.join(", ")} (${fps} frame/s, 35 per sheet). Cut threshold ${t} (scdet score).\n\n${hits.map((h) => `- ${h.t.toFixed(2)}s (score ${h.score.toFixed(1)})`).join("\n")}\n`,
  );
  return { dir: out, sheets, cuts };
}
