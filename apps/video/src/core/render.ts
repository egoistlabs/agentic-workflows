// Bundles a video with the shared engine and renders stills or the video.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { videoDir, readJson, root, statusField } from "./files.js";
import { brandTokens, defaultBrand } from "./brand.js";
import { ffmpeg } from "./ff.js";
import type { LayoutSeg } from "./layout.js";

export interface Timeline {
  width: number;
  height: number;
  fps: number;
  duration: number;
  audio?: string;
  /** Word timings, relative to the video folder. Default 03-source/words.json. */
  words?: string;
  /** `show: false`: the scenes carry the payoff natively (R1). */
  hook?: { text: string; sub?: string; until?: number; show?: boolean };
  /** `emphasis`: [start, end] seconds of caption phrases set in the accent serif (X6). */
  captions?: {
    style?: string;
    fix?: Record<string, string>;
    bottom?: number;
    stop?: string[];
    emphasis?: [number, number][];
  };
  /**
   * The talking-head footage under every scene, muted (audio stays in `audio`).
   * `cam`: one [zoom, saturation] per frame; `last` shows after `end` seconds.
   */
  footage?: {
    src: string;
    last?: string;
    end?: number;
    cam?: [number, number][] | number[][];
    origin?: string;
    /** Explainer: face / split / canvas segments (X1). */
    layout?: LayoutSeg[];
    /** Explainer: the footage card and the caption seam (format.split). */
    split?: {
      card: [number, number, number, number];
      radius: number;
      seam: number;
    };
    /** Explainer: the cut-out speaker (transparent webm) for the head break-out, and its last frame. */
    alpha?: string;
    alphaLast?: string;
  };
  /** Explainer: times the hero object shows (X2). */
  hero?: number[];
  scenes: {
    id: string;
    start: number;
    blend?: number;
    events?: number[];
    props?: Record<string, unknown>;
  }[];
  sfx?: { t: number; src: string; volume?: number }[];
  showSafeZone?: boolean;
  /** Set by stills: Zones and captions log their rects for QA. */
  recordZones?: boolean;
}

export type Word = { t: string; s: number; e: number };

/** The input props the engine receives: timeline, words, brand tokens and the face track. */
export function loadProps(dir: string) {
  const timeline = readJson<Timeline>(join(dir, "05-build", "timeline.json"));
  const wordsPath = join(dir, timeline.words ?? "03-source/words.json");
  const words = existsSync(wordsPath) ? readJson<Word[]>(wordsPath) : [];
  const brandDir = statusField(dir, "brand");
  const brand = brandTokens(brandDir);
  // Brand assets are copied to assets/brand/, so make file tokens point there. A file
  // the video lacks (a default-pack font such as fontAccentFile) is copied from the
  // project pack or the default pack; a token whose file exists nowhere is dropped.
  for (const [k, v] of Object.entries(brand)) {
    if (!/File$/.test(k)) continue;
    const rel = v.startsWith("brand/") ? v : `brand/${v}`;
    const dest = join(dir, "assets", rel);
    const src = [brandDir, defaultBrand]
      .filter((b): b is string => !!b && b !== "none")
      .map((b) => join(b, "assets", rel.slice("brand/".length)))
      .find((p) => existsSync(p));
    if (!existsSync(dest) && src) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
    }
    if (existsSync(dest)) brand[k] = rel;
    else delete brand[k];
  }
  const facePath = join(dir, "assets", "face.json");
  const face = existsSync(facePath)
    ? (JSON.parse(readFileSync(facePath, "utf8")) as unknown)
    : null;
  return { timeline, words, brand, face };
}

export interface ZoneLog {
  frame: number;
  id: string;
  place: string;
  rect: Rect;
  keepOut: Rect | null;
  forced: boolean;
}
export type Rect = { x: number; y: number; w: number; h: number };
export interface StillLog {
  t: number;
  frame: number;
  file: string;
  zones: ZoneLog[];
  captions?: { style: string; rect: Rect; stroke: boolean };
}

const MARK = /^\[agentic-video:(zone|captions)\] (.*)$/;

export async function bundleVideo(dir: string): Promise<string> {
  const scenes = join(dir, "05-build", "scenes.jsx");
  if (!existsSync(scenes)) throw new Error("05-build/scenes.jsx is missing");
  return bundle({
    entryPoint: join(root, "engine", "root.jsx"),
    publicDir: join(dir, "assets"),
    onProgress: () => undefined,
    // Scenes change between calls; a cached bundle would serve stale code.
    enableCaching: false,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...(config.resolve?.alias as object),
          "@scenes": scenes,
          "@engine": join(root, "engine", "index.jsx"),
        },
        // Scenes live in another repo; resolve react/remotion from ours. In the
        // agentic-workflows workspace, npm hoists them to the workspace root.
        modules: [
          join(root, "node_modules"),
          join(root, "..", "..", "node_modules"),
          "node_modules",
        ],
      },
    }),
  });
}

async function prepare(slug: string, safeZone: boolean, recordZones = false) {
  const dir = videoDir(slug);
  const serveUrl = await bundleVideo(dir);
  const props = loadProps(dir);
  if (safeZone) props.timeline.showSafeZone = true;
  // Set before selectComposition: the composition carries the props it resolved.
  if (recordZones) props.timeline.recordZones = true;
  const composition = await selectComposition({
    serveUrl,
    id: "Video",
    inputProps: props,
  });
  return { dir, serveUrl, props, composition };
}

/** Renders PNG stills at the given seconds into 06-qa/stills/. */
export async function stills(
  slug: string,
  times: number[],
  { safeZone = false } = {},
): Promise<string[]> {
  const { dir, serveUrl, props, composition } = await prepare(
    slug,
    safeZone,
    true,
  );
  const out = join(dir, "06-qa", "stills");
  mkdirSync(out, { recursive: true });
  const files: string[] = [];
  // Zones and captions log their rects; QA checks them against the face (T4) and contrast.
  const sidecar = join(dir, "06-qa", "zones.json");
  const logs: StillLog[] = existsSync(sidecar)
    ? (JSON.parse(readFileSync(sidecar, "utf8")) as { stills: StillLog[] })
        .stills
    : [];
  for (const t of times) {
    const frame = Math.min(
      composition.durationInFrames - 1,
      Math.round(t * composition.fps),
    );
    const output = join(out, `t${t.toFixed(1).padStart(5, "0")}.png`);
    const log: StillLog = { t, frame, file: output, zones: [] };
    await renderStill({
      serveUrl,
      composition,
      frame,
      output,
      inputProps: props,
      onBrowserLog: ({ text }) => {
        const m = text.match(MARK);
        if (!m) return;
        const v = JSON.parse(m[2]!) as ZoneLog & StillLog["captions"];
        if (v.frame !== frame) return;
        if (m[1] === "captions")
          log.captions = { style: v.style, rect: v.rect, stroke: v.stroke };
        // The last render of a frame wins (a Zone re-renders once its height is measured).
        else log.zones = [...log.zones.filter((z) => z.id !== v.id), v];
      },
    });
    files.push(output);
    const i = logs.findIndex((l) => l.frame === frame);
    if (i >= 0) logs[i] = log;
    else logs.push(log);
  }
  logs.sort((a, b) => a.frame - b.frame);
  writeFileSync(sidecar, JSON.stringify({ stills: logs }, null, 1));
  return files;
}

export interface Loudness {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
  output_i?: string;
  output_tp?: string;
}

const TARGET = "I=-14:TP=-1.5:LRA=11";

/** Integrated loudness and true peak of a file (loudnorm's first pass). */
export function measureLoudness(file: string): Loudness {
  const out = ffmpeg(
    [
      "-i",
      file,
      "-vn",
      "-af",
      `loudnorm=${TARGET}:print_format=json`,
      "-f",
      "null",
      "-",
    ],
    { timeout: 600 },
  );
  const json = out.slice(out.lastIndexOf("{"), out.lastIndexOf("}") + 1);
  return JSON.parse(json) as Loudness;
}

/** 8 kHz mono samples of a file's audio. */
function pcm8k(file: string): Float32Array {
  const dir = mkdtempSync(join(tmpdir(), "agentic-video-"));
  try {
    const wav = join(dir, "a.wav");
    ffmpeg(
      [
        "-v",
        "error",
        "-i",
        file,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "8000",
        "-c:a",
        "pcm_s16le",
        wav,
      ],
      { timeout: 300 },
    );
    const buf = readFileSync(wav);
    const data = buf.indexOf("data") + 8;
    const out = new Float32Array(Math.floor((buf.length - data) / 2));
    for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(data + i * 2);
    return out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * How late (seconds) the rendered audio runs against the source VO, by
 * cross-correlation over a few windows. Remotion's mix lands ~42 ms (two AAC
 * frames) late, which puts a talking head out of lip sync. Undefined if unsure.
 */
export function audioLag(source: string, rendered: string): number | undefined {
  const a = pcm8k(source);
  const b = pcm8k(rendered);
  const SR = 8000,
    WIN = 3 * SR,
    MAX = 0.1 * SR;
  const lags: number[] = [];
  for (
    let s = 2 * SR;
    s + WIN + MAX < Math.min(a.length, b.length) && lags.length < 5;
    s += 12 * SR
  ) {
    let best = { c: -1, lag: 0 };
    for (let lag = -MAX; lag <= MAX; lag++) {
      let dot = 0,
        na = 0,
        nb = 0;
      for (let i = 0; i < WIN; i += 2) {
        const x = a[s + i]!,
          y = b[s + lag + i]!;
        dot += x * y;
        na += x * x;
        nb += y * y;
      }
      const c = dot / (Math.sqrt(na * nb) || 1);
      if (c > best.c) best = { c, lag };
    }
    if (best.c > 0.5) lags.push(best.lag);
  }
  if (lags.length < 3) return undefined;
  lags.sort((x, y) => x - y);
  const mid = lags[Math.floor(lags.length / 2)]!;
  // Agreeing windows only: a constant offset, not drift.
  return lags.every((l) => Math.abs(l - mid) <= 8) ? mid / SR : undefined;
}

/**
 * Second loudnorm pass, audio only (video copied): -14 LUFS, -1.5 dBTP.
 * `lag` (seconds) is trimmed off the audio's start first, so it lines up with the picture.
 */
export function normalise(file: string, lag = 0): Loudness {
  const m = measureLoudness(file);
  const tmp = file.replace(/\.mp4$/, ".loudnorm.mp4");
  // Pad the end by what was trimmed, so the audio keeps its length (finite: an endless
  // apad with -shortest never ends when the video is stream-copied).
  const shift =
    lag > 0
      ? `atrim=start=${lag.toFixed(4)},asetpts=PTS-STARTPTS,apad=pad_dur=${lag.toFixed(4)},`
      : "";
  const out = ffmpeg(
    [
      "-i",
      file,
      "-map",
      "0",
      "-c:v",
      "copy",
      "-af",
      `${shift}loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`,
      "-ar",
      "48000",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      tmp,
    ],
    { timeout: 600 },
  );
  renameSync(tmp, file);
  const after = JSON.parse(
    out.slice(out.lastIndexOf("{"), out.lastIndexOf("}") + 1),
  ) as Loudness;
  return { ...m, output_i: after.output_i, output_tp: after.output_tp };
}

/** Writes or replaces the Loudness section of 06-qa/qa.md. */
function recordLoudness(dir: string, l: Loudness, lag?: number) {
  const qa = join(dir, "06-qa", "qa.md");
  const sync =
    lag === undefined
      ? ""
      : lag > 0
        ? ` Audio ran ${(lag * 1000).toFixed(1)} ms late against the picture; trimmed.`
        : " Audio lines up with the picture.";
  const section = `## Loudness\n\nBefore: ${l.input_i} LUFS, ${l.input_tp} dBTP. After loudnorm (I=-14, TP=-1.5): ${l.output_i} LUFS, ${l.output_tp} dBTP.${sync}\n`;
  const doc = existsSync(qa)
    ? readFileSync(qa, "utf8").replace(/\n## Loudness\n[\s\S]*?(?=\n## |$)/, "")
    : "";
  mkdirSync(join(dir, "06-qa"), { recursive: true });
  writeFileSync(qa, `${doc.trimEnd()}\n\n${section}`);
}

/** Renders the full video to 07-render/<slug>.mp4. */
export async function render(
  slug: string,
  onProgress?: (p: number) => void,
): Promise<string> {
  const { dir, serveUrl, props, composition } = await prepare(slug, false);
  mkdirSync(join(dir, "07-render"), { recursive: true });
  const output = join(dir, "07-render", `${slug}.mp4`);
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    crf: 18,
    outputLocation: output,
    inputProps: props,
    onProgress: ({ progress }) => onProgress?.(progress),
  });
  const tl = props.timeline;
  if (tl.audio || tl.sfx?.length) {
    // Lip sync matters only when footage plays against the VO.
    const lag =
      tl.audio && tl.footage
        ? audioLag(join(dir, "assets", tl.audio), output)
        : undefined;
    recordLoudness(
      dir,
      normalise(output, lag !== undefined && lag > 0.005 ? lag : 0),
      lag,
    );
  }
  return output;
}
