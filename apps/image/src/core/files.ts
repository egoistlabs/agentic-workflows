// Paths, the stage map, formats, sizes and small file helpers shared by the core modules.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The agentic-image repo (two levels up from dist/core or src/core). */
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const read = (path: string) => readFileSync(path, "utf8");
export const readJson = <T>(path: string): T => JSON.parse(read(path)) as T;

export interface Checkpoint {
  /** File in the stage folder that needs an "approved: yes" line. */
  file: string;
  /** What the human approves there: "Copy" or "Visuals". */
  approves: string;
}

export interface StageMap {
  stages: string[];
  /** Stage → its checkpoint. Stages without one move on without approval. */
  checkpoints: Record<string, Checkpoint>;
}

/** The stage order and checkpoints, from template/stages.json. */
export function stageMap(): StageMap {
  const m = readJson<StageMap>(join(root, "template", "stages.json"));
  for (const s of Object.keys(m.checkpoints))
    if (!m.stages.includes(s))
      throw new Error(
        `template/stages.json: checkpoint for unknown stage ${s}`,
      );
  return m;
}

export const FORMATS = {
  carousel: "a numbered set of slides, posted together",
  image: "one image with a caption",
} as const;
export type Format = keyof typeof FORMATS;

export interface Size {
  width: number;
  height: number;
  ratio: string;
  use: string;
}

/** Output sizes in pixels. */
export const SIZES = {
  portrait: {
    width: 1080,
    height: 1350,
    ratio: "4:5",
    use: "Default for Facebook and Instagram",
  },
  square: {
    width: 1080,
    height: 1080,
    ratio: "1:1",
    use: "Facebook and Instagram",
  },
  story: {
    width: 1080,
    height: 1920,
    ratio: "9:16",
    use: "TikTok photo posts, Stories",
  },
  "fb-cover": {
    width: 1640,
    height: 924,
    ratio: "16:9",
    use: "Facebook Page cover; desktop shows only the middle 1640×624 band",
  },
} as const satisfies Record<string, Size>;
export type SizeName = keyof typeof SIZES;

export function checkFormat(name: string): Format {
  if (!(name in FORMATS))
    throw new Error(
      `unknown format "${name}" (${Object.keys(FORMATS).join(", ")})`,
    );
  return name as Format;
}

export function checkSize(name: string): SizeName {
  if (!(name in SIZES))
    throw new Error(
      `unknown size "${name}" (${Object.keys(SIZES).join(", ")})`,
    );
  return name as SizeName;
}

export const sizeLabel = (name: SizeName) =>
  `${name} ${SIZES[name].width}×${SIZES[name].height}`;

export const imagesDir = (cwd = process.cwd()) => join(cwd, ".images");

export function jobDir(slug: string, cwd = process.cwd()): string {
  if (!slug) throw new Error("missing job slug");
  const dir = join(imagesDir(cwd), slug);
  if (!existsSync(dir))
    throw new Error(`.images/${slug} not found; run agentic-image new first`);
  return dir;
}

/** Reads `key: value` lines from the top of STATUS.md. */
export function statusField(dir: string, key: string): string | undefined {
  return read(join(dir, "STATUS.md"))
    .match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]
    ?.trim();
}
