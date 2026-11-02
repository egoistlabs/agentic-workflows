// Talking-head source tooling: silences, the approved keep list snapped to real
// silence edges, the cut render, and word timings remapped onto the cut.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import {
  ffmpeg,
  ffprobeBin,
  fullFfmpeg,
  probeDuration,
  probeVideo,
  run,
} from "./ff.js";
import {
  MAX_SPEED,
  videoDir,
  loadFormat,
  mdField,
  readJson,
  statusField,
} from "./files.js";
import type { Word } from "./render.js";

export type Silence = [number, number];

const NOISE = "-33dB";
const MIN_SILENCE = 0.25;
const PAD = 0.08;
/** Gap kept from a neighbouring cut word. */
const GUARD = 0.03;
/** How far past a Whisper word edge the real silence edge may sit. */
const REACH = 0.6;
/** Shortest piece a pause split may leave; shorter ones read as a glitch. */
const MIN_PIECE = 0.3;
const OUT_FPS = 30;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Silences in a clip, cached in 03-source/silences.json per clip, size and mtime. */
export function silences(dir: string, clip: string): Silence[] {
  const cache = join(dir, "03-source", "silences.json");
  const st = statSync(clip);
  const key = `${relative(dir, clip)}|${st.size}|${st.mtimeMs}|${NOISE}|${MIN_SILENCE}`;
  if (existsSync(cache)) {
    const c = readJson<{ key: string; silences: Silence[] }>(cache);
    if (c.key === key) return c.silences;
  }
  const out = ffmpeg(
    [
      "-i",
      clip,
      "-map",
      "0:a:0",
      "-af",
      `silencedetect=noise=${NOISE}:d=${MIN_SILENCE}`,
      "-f",
      "null",
      "-",
    ],
    {
      timeout: 600,
    },
  );
  const list: Silence[] = [];
  for (const m of out.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    if (m[1] === "start") list.push([Math.max(0, Number(m[2])), NaN]);
    else if (list.length) list[list.length - 1]![1] = Number(m[2]);
  }
  const last = list[list.length - 1];
  if (last && Number.isNaN(last[1])) last[1] = probeDuration(clip);
  // silencedetect often reports one pause as two pieces a millisecond apart.
  const merged: Silence[] = [];
  for (const [a, b] of list) {
    const last = merged[merged.length - 1];
    if (last && a - last[1] < 0.05) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  const silences = merged.map(([a, b]) => [r3(a), r3(b)] as Silence);
  mkdirSync(join(dir, "03-source"), { recursive: true });
  writeFileSync(cache, JSON.stringify({ key, silences }));
  return silences;
}

export interface KeepBeat {
  beat: string;
  /** First and last kept word, as indices into words.json (inclusive). */
  from: number;
  to: number;
  /** Optional source-second overrides for the in and out points. */
  start?: number;
  end?: number;
}

export interface Segment {
  beat: string;
  in: number;
  out: number;
}

export interface CutMap {
  clip: string;
  speed: number;
  fps: number;
  duration: number;
  segments: (Segment & { start: number; frames: number })[];
}

/** Reads 03-source/keep.json: a beat list, or {clip, keep} with the clip named. */
export function loadKeep(
  dir: string,
  clipFlag?: string,
): { clip: string; keep: KeepBeat[] } {
  const p = join(dir, "03-source", "keep.json");
  if (!existsSync(p))
    throw new Error(
      "03-source/keep.json is missing; write the approved keep list first",
    );
  const raw = readJson<KeepBeat[] | { clip?: string; keep: KeepBeat[] }>(p);
  const keep = Array.isArray(raw) ? raw : raw.keep;
  let clip = clipFlag ?? (Array.isArray(raw) ? undefined : raw.clip);
  if (!clip) {
    const videos = readdirSync(join(dir, "assets")).filter(
      (f) => /\.(mp4|mov|mkv|webm)$/i.test(f) && !/^cut/.test(f),
    );
    if (videos.length !== 1)
      throw new Error(
        `name the source clip in keep.json ({"clip": "assets/…", "keep": […]}) or with --clip; found ${videos.join(", ") || "none"}`,
      );
    clip = join("assets", videos[0]!);
  }
  const abs = join(dir, clip);
  if (!existsSync(abs)) throw new Error(`clip ${clip} not found`);
  keep.forEach((k, i) => {
    if (!(k.from <= k.to))
      throw new Error(`keep.json beat ${i} (${k.beat}): from must be ≤ to`);
    if (i && k.from <= keep[i - 1]!.to)
      throw new Error(
        `keep.json beat ${i} (${k.beat}) overlaps the one before`,
      );
  });
  return { clip: abs, keep };
}

/**
 * Turns keep beats into source segments: each edge snaps out to the real silence
 * edge (Whisper word edges run early), bounded by the neighbouring cut word, then
 * every pause over MIN_SILENCE inside a beat is split out.
 */
export function segmentsFor(
  keep: KeepBeat[],
  words: Word[],
  sil: Silence[],
): Segment[] {
  const out: Segment[] = [];
  for (const k of keep) {
    const first = words[k.from];
    const last = words[k.to];
    if (!first || !last)
      throw new Error(
        `keep beat ${k.beat}: word index out of range (words.json has ${words.length})`,
      );
    const prev = words[k.from - 1];
    const next = words[k.to + 1];

    let a = k.start;
    if (a === undefined) {
      const before = sil.filter(
        ([, e]) => e >= first.s - REACH && e <= first.s + 0.15,
      );
      a =
        Math.min(
          first.s,
          before.length ? before[before.length - 1]![1] : first.s,
        ) - PAD;
      // The guard never pushes the edge into the kept word (Whisper glues neighbours).
      if (prev) a = Math.max(a, Math.min(prev.e + GUARD, first.s));
      a = Math.max(0, a);
    }
    let b = k.end;
    if (b === undefined) {
      const after = sil.find(
        ([s]) => s >= last.e - 0.15 && s <= last.e + REACH,
      );
      b = Math.max(last.e, after ? after[0] : last.e) + PAD;
      if (next) b = Math.min(b, Math.max(next.s - GUARD, last.e));
    }
    if (b <= a)
      throw new Error(
        `keep beat ${k.beat}: empty after snapping (${a.toFixed(2)}–${b.toFixed(2)})`,
      );

    // Pauses strictly inside the beat become jump cuts, unless that leaves a sliver.
    const pieces: [number, number][] = [[a, b]];
    for (const [s, e] of sil) {
      if (s <= a + PAD || e >= b - PAD || e - s <= MIN_SILENCE) continue;
      const cur = pieces[pieces.length - 1]!;
      if (s + PAD - cur[0] < MIN_PIECE || b - (e - PAD) < MIN_PIECE) continue;
      pieces.push([e - PAD, cur[1]]);
      cur[1] = s + PAD;
    }
    for (const [x, y] of pieces)
      out.push({ beat: k.beat, in: r3(x), out: r3(y) });
  }
  return out;
}

/** Source video frame times (from packets, no decode), sorted. */
function frameTimes(clip: string): number[] {
  const out = run(
    ffprobeBin(),
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "packet=pts_time",
      "-of",
      "csv=p=0",
      clip,
    ],
    { timeout: 300 },
  );
  return out
    .split("\n")
    .map((l) => Number(l.split(",")[0]))
    .filter((t) => Number.isFinite(t) && t >= 0)
    .sort((x, y) => x - y);
}

interface Plan {
  /** Video select windows, at midpoints between frames so float compare is safe. */
  vwin: [number, number][];
  /** Audio windows: same length as the selected video. */
  awin: [number, number][];
  frames: number[];
}

function plan(segs: Segment[], times: number[], fps: number): Plan {
  const p: Plan = { vwin: [], awin: [], frames: [] };
  for (const s of segs) {
    const k0 = times.findIndex((t) => t >= s.in);
    let k1 = times.findLastIndex((t) => t <= s.out);
    if (k0 < 0 || k1 < k0)
      throw new Error(`segment ${s.in}–${s.out} has no video frames`);
    const mid = (i: number, j: number) =>
      ((times[i] ?? times[j]! - 1 / fps) + (times[j] ?? times[i]! + 1 / fps)) /
      2;
    const n = k1 - k0 + 1;
    p.vwin.push([mid(k0 - 1, k0), mid(k1, k1 + 1)]);
    p.awin.push([times[k0]!, times[k0]! + n / fps]);
    p.frames.push(n);
  }
  return p;
}

const f4 = (n: number) => n.toFixed(4);
const between = (w: [number, number][]) =>
  w.map(([a, b]) => `between(t,${f4(a)},${f4(b)})`).join("+");
/** Half-open windows, so back-to-back audio windows never share a chunk. */
const halfOpen = (w: [number, number][]) =>
  w.map(([a, b]) => `gte(t,${f4(a)})*lt(t,${f4(b)})`).join("+");

/** One decode: select the kept frames and samples, retime, speed up. */
function renderOnePass(
  clip: string,
  p: Plan,
  speed: number,
  outVideo: string,
  outWav: string | null,
  preview: boolean,
  timeout: number,
) {
  const tempo = speed !== 1 ? `,setpts=PTS/${speed}` : "";
  const v = `[0:v:0]select='${between(p.vwin)}',setpts=N/FRAME_RATE/TB${tempo},fps=${OUT_FPS}${preview ? ",scale=-2:540" : ""}[v]`;
  // 64-sample chunks so aselect can cut within ~1.3 ms instead of whole AAC frames.
  const a = `[0:a:0]aresample=48000,asetnsamples=n=64:p=0,aselect='${halfOpen(p.awin)}',asetpts=N/SR/TB${speed !== 1 ? `,atempo=${speed}` : ""}${outWav ? ",asplit[a][w]" : "[a]"}`;
  const args = [
    "-threads",
    "1",
    "-filter_threads",
    "1",
    "-i",
    clip,
    "-filter_complex",
    `${v};${a}`,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    preview ? "veryfast" : "fast",
    "-crf",
    preview ? "26" : "18",
    "-pix_fmt",
    "yuv420p",
    "-threads",
    "1",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outVideo,
  ];
  if (outWav) args.push("-map", "[w]", "-c:a", "pcm_s16le", outWav);
  ffmpeg(["-v", "error", "-stats", ...args], {
    full: true,
    inherit: true,
    timeout,
  });
}

/**
 * Fallback: one segment at a time, seeking before -i (so -t limits the input),
 * then concat. Each part's audio is trimmed to its video's exact length and the
 * WAV is joined losslessly, so joins can't drift. Returns real segment lengths.
 */
function renderSequential(
  clip: string,
  segs: Segment[],
  speed: number,
  outVideo: string,
  outWav: string,
  preview: boolean,
  work: string,
): number[] {
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const full = !!fullFfmpeg();
  const lengths: number[] = [];
  const vlist: string[] = [];
  const alist: string[] = [];
  const entry = (f: string) => `file '${f.replace(/'/g, "'\\''")}'`;
  segs.forEach((s, i) => {
    const seek = ["-ss", s.in.toFixed(3), "-t", (s.out - s.in).toFixed(3)];
    const v = join(work, `${String(i).padStart(3, "0")}.mov`);
    // `-r` as an output option pads parts with duplicate frames; the fps filter
    // doesn't. The bundled build has neither fps nor setpts, so it falls back to
    // -itsscale and -r.
    const vf = [
      full && speed !== 1 ? `setpts=PTS/${speed}` : "",
      full ? `fps=${OUT_FPS}` : "",
      preview ? "scale=-2:540" : "",
    ]
      .filter(Boolean)
      .join(",");
    ffmpeg(
      [
        "-v",
        "error",
        "-threads",
        "1",
        ...seek,
        ...(!full && speed !== 1 ? ["-itsscale", String(1 / speed)] : []),
        "-i",
        clip,
        "-map",
        "0:v:0",
        "-an",
        ...(vf ? ["-vf", vf] : []),
        ...(full ? [] : ["-r", String(OUT_FPS)]),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        preview ? "26" : "18",
        "-pix_fmt",
        "yuv420p",
        v,
      ],
      { full, timeout: 300 },
    );
    const d = probeDuration(v, "v");
    const a = join(work, `${String(i).padStart(3, "0")}.wav`);
    ffmpeg(
      [
        "-v",
        "error",
        "-threads",
        "1",
        ...seek,
        "-i",
        clip,
        "-map",
        "0:a:0",
        "-af",
        `${speed !== 1 ? `atempo=${speed},` : ""}aresample=48000,apad,atrim=end=${d.toFixed(6)}`,
        "-c:a",
        "pcm_s16le",
        a,
      ],
      { full, timeout: 300 },
    );
    lengths.push(d);
    vlist.push(entry(v));
    alist.push(entry(a));
    console.log(`  segment ${i + 1}/${segs.length}`);
  });
  writeFileSync(join(work, "video.txt"), vlist.join("\n"));
  writeFileSync(join(work, "audio.txt"), alist.join("\n"));
  ffmpeg(
    [
      "-v",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      join(work, "audio.txt"),
      "-c",
      "copy",
      outWav,
    ],
    { full, timeout: 600 },
  );
  ffmpeg(
    [
      "-v",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      join(work, "video.txt"),
      "-i",
      outWav,
      "-map",
      "0:v",
      "-map",
      "1:a",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      outVideo,
    ],
    { full, timeout: 600 },
  );
  rmSync(work, { recursive: true, force: true });
  return lengths;
}

/** Speed for a video: flag, else `Speed:` in the brief, else the format default. */
export function videoSpeed(dir: string, flag?: string): number {
  const fromBrief = mdField(join(dir, "00-brief", "brief.md"), "speed")?.match(
    /[\d.]+/,
  )?.[0];
  const format = loadFormat(statusField(dir, "format") ?? "");
  const speed = Number(flag ?? fromBrief ?? format.speed ?? 1);
  if (!(speed >= 0.5 && speed <= MAX_SPEED))
    throw new Error(`speed ${speed} is out of range (0.5–${MAX_SPEED})`);
  return speed;
}

/** Keep-list words placed on the cut timeline. Picks words by index, never by midpoint. */
export function remapWords(
  keep: KeepBeat[],
  words: Word[],
  map: CutMap,
): Word[] {
  const out: Word[] = [];
  let prev = 0;
  for (const k of keep) {
    const segs = map.segments.filter((s) => s.beat === k.beat);
    const place = (t: number) => {
      // The segment holding t, else the nearest one of this beat (t sat in a removed pause).
      const seg =
        segs.find((s) => t >= s.in && t <= s.out) ??
        segs.reduce((best, s) =>
          Math.min(Math.abs(t - s.in), Math.abs(t - s.out)) <
          Math.min(Math.abs(t - best.in), Math.abs(t - best.out))
            ? s
            : best,
        );
      return (
        seg.start +
        (Math.min(seg.out, Math.max(seg.in, t)) - seg.in) / map.speed
      );
    };
    for (let i = k.from; i <= k.to; i++) {
      const w = words[i]!;
      const s = Math.max(place(w.s), prev);
      const e = Math.max(place(w.e), s + 0.08);
      out.push({ t: w.t, s: r3(s), e: r3(e) });
      prev = s + 0.02;
    }
  }
  return out;
}

export interface CutResult {
  segments: number;
  duration: number;
  drift?: number;
  files: string[];
  onePass: boolean;
}

/**
 * Renders the keep list. Full: assets/cut.mp4, cut-audio.wav, cut-last.png,
 * words-cut.json, edl.json, cut-map.json. Preview: 03-source/rough-cut.mp4 at 540p.
 */
export function cut(
  slug: string,
  o: {
    preview?: boolean;
    speed?: string;
    clip?: string;
    sequential?: boolean;
  } = {},
): CutResult {
  const dir = videoDir(slug);
  const { clip, keep } = loadKeep(dir, o.clip);
  const words = readJson<Word[]>(join(dir, "03-source", "words.json"));
  const speed = videoSpeed(dir, o.speed);
  const segs = segmentsFor(keep, words, silences(dir, clip));
  const { fps } = probeVideo(clip);
  const times = frameTimes(clip);
  const p = plan(segs, times, fps);
  const assets = join(dir, "assets");
  const outVideo = o.preview
    ? join(dir, "03-source", "rough-cut.mp4")
    : join(assets, "cut.mp4");
  const outWav = o.preview ? null : join(assets, "cut-audio.wav");
  const source = probeDuration(clip);
  console.log(
    `${segs.length} segments from ${keep.length} beats, ${(p.frames.reduce((x, y) => x + y, 0) / fps / speed).toFixed(2)}s at ${speed}×`,
  );

  let onePass = true;
  let lengths = p.frames.map((n) => n / fps / speed);
  try {
    if (o.sequential) throw new Error("--sequential");
    if (!fullFfmpeg())
      throw new Error("no full ffmpeg build for the one-pass cut");
    renderOnePass(
      clip,
      p,
      speed,
      outVideo,
      outWav,
      !!o.preview,
      Math.max(900, source * 12),
    );
  } catch (e) {
    console.log(
      o.sequential
        ? "Rendering segments one at a time (--sequential)."
        : `One-pass cut failed (${(e as Error).message.split("\n")[0]}); rendering segments one at a time.`,
    );
    onePass = false;
    const work = join(assets, ".cutparts");
    lengths = renderSequential(
      clip,
      segs,
      speed,
      outVideo,
      outWav ?? join(work, "..", ".preview.wav"),
      !!o.preview,
      work,
    );
    if (!outWav) rmSync(join(assets, ".preview.wav"), { force: true });
  }

  const duration = probeDuration(outVideo, "v");
  if (o.preview)
    return { segments: segs.length, duration, files: [outVideo], onePass };

  const drift = probeDuration(outWav!) - duration;
  if (Math.abs(drift) > 0.05)
    throw new Error(
      `audio and video differ by ${drift.toFixed(3)}s (limit 0.05s); cut.mp4 and cut-audio.wav are not in sync`,
    );

  let t = 0;
  const map: CutMap = {
    clip: relative(dir, clip),
    speed,
    fps,
    duration: r3(duration),
    segments: segs.map((s, i) => {
      const seg = { ...s, start: r3(t), frames: p.frames[i]! };
      t += lengths[i]!;
      return seg;
    }),
  };
  writeFileSync(join(assets, "cut-map.json"), JSON.stringify(map, null, 1));
  writeFileSync(
    join(assets, "edl.json"),
    JSON.stringify(
      segs.map((s) => ({ clip: map.clip, ...s })),
      null,
      1,
    ),
  );
  writeFileSync(
    join(assets, "words-cut.json"),
    JSON.stringify(remapWords(keep, words, map)),
  );
  // Last frame, for holds after the video ends.
  ffmpeg(
    [
      "-v",
      "error",
      "-sseof",
      "-0.5",
      "-i",
      outVideo,
      "-map",
      "0:v:0",
      "-update",
      "1",
      join(assets, "cut-last.png"),
    ],
    { timeout: 120 },
  );
  const files = [
    "cut.mp4",
    "cut-audio.wav",
    "cut-last.png",
    "words-cut.json",
    "edl.json",
    "cut-map.json",
  ].map((f) => join(assets, f));
  return { segments: segs.length, duration, drift, files, onePass };
}
