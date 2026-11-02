// Paths and small file helpers shared by the core modules.
import { existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The agentic-video repo (two levels up from dist/core or src/core). */
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** The first `name` executable on PATH (with `.exe`/`.cmd` on Windows), or undefined. */
export function findOnPath(name: string): string | undefined {
  const exts = process.platform === "win32" ? ["", ".exe", ".cmd"] : [""];
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const p = join(dir, name + ext);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

export const STAGES = [
  "00-brief",
  "01-references",
  "02-story",
  "03-source",
  "04-storyboard",
  "05-build",
  "06-qa",
  "07-render",
] as const;
export type Stage = (typeof STAGES)[number];

export interface Format {
  name: string;
  description: string;
  stages: Stage[];
  /** Stage → file that needs an "approved: yes" line before moving on. */
  checkpoints: Partial<Record<Stage, string>>;
  width: number;
  height: number;
  fps: number;
  /** Longest gap in seconds between on-screen events (R3). */
  maxGap: number;
  captions: "lower" | "keyword" | "word" | "none";
  /** Rule groups from MOTION_PHILOSOPHY.md that apply: "core" plus "motion", "talking-head" or "explainer". */
  rules: string[];
  /** Caption distance from the bottom, as a fraction of the height. */
  captionsBottom?: number;
  /** Default playback speed of the cut (talking-head). Never above MAX_SPEED. */
  speed?: number;
  /** SFX set `agentic-video sfx` generates: "soft" or "loud". */
  sfxPalette?: "soft" | "loud";
  /** Seconds held after the last word. */
  hold?: number;
  /** Explainer split layout (1080×1920 px): the footage card, its corner radius, the caption seam, head break-out and face punch-ins. */
  split?: Split;
  /** Explainer: [min, max] share of the runtime in the face layout (X1). */
  faceShare?: [number, number];
}

export interface Split {
  /** [x, y, w, h] of the footage card; it may bleed off the bottom edge. */
  card: [number, number, number, number];
  radius: number;
  /** Caption `bottom` (fraction of the height) on the seam above the card. */
  seam: number;
  /** Share of the head (hair top to chin) that rises above the card's top edge. */
  popOut: number;
  /** Zoom cycle for reframes inside face segments. */
  pattern: number[];
}

export const MAX_SPEED = 1.1;

export const talkingHead = (f: Format) => f.rules.includes("talking-head");
export const explainer = (f: Format) => f.rules.includes("explainer");
/** Formats cut from raw footage with a footage layer: talking-head and explainer. */
export const footageFirst = (f: Format) => talkingHead(f) || explainer(f);

export const videosDir = (cwd = process.cwd()) => join(cwd, ".videos");

export function videoDir(slug: string, cwd = process.cwd()): string {
  if (!slug) throw new Error("missing video slug");
  const dir = join(videosDir(cwd), slug);
  if (!existsSync(dir))
    throw new Error(`.videos/${slug} not found; run agentic-video new first`);
  return dir;
}

export const read = (path: string) => readFileSync(path, "utf8");
export const readJson = <T>(path: string): T => JSON.parse(read(path)) as T;

export function loadFormat(name: string): Format {
  const path = join(root, "formats", `${name}.json`);
  if (!existsSync(path)) throw new Error(`unknown format "${name}"`);
  const f = readJson<Omit<Format, "name">>(path);
  return { name, ...f, rules: f.rules ?? ["core"] };
}

/** Reads `Key: value` from a markdown file such as the brief (case-insensitive, bold allowed). */
export function mdField(path: string, key: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return read(path)
    .match(new RegExp(`^[-*\\s]*\\**${key}\\**:\\**\\s*(.+)$`, "im"))?.[1]
    ?.trim();
}

/** Reads `key: value` lines from the top of STATUS.md. */
export function statusField(dir: string, key: string): string | undefined {
  return read(join(dir, "STATUS.md"))
    .match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]
    ?.trim();
}
