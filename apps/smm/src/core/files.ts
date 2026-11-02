// Paths and small file helpers shared by the core modules.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The agentic-smm repo (two levels up from dist/core or src/core). */
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const read = (path: string) => readFileSync(path, "utf8");
export const readJson = <T>(path: string): T => JSON.parse(read(path)) as T;

export interface StageMap {
  /** Stage folders in order, as named in template/. */
  stages: string[];
  /** Stage → file that needs an "approved: yes" line before moving on. */
  checkpoints: Record<string, string>;
}

/** The stage order and checkpoints, from template/stages.json. */
export function loadStages(): StageMap {
  const m = readJson<StageMap>(join(root, "template", "stages.json"));
  for (const s of Object.keys(m.checkpoints))
    if (!m.stages.includes(s))
      throw new Error(
        `template/stages.json: checkpoint for unknown stage ${s}`,
      );
  return m;
}

export const plansDir = (cwd = process.cwd()) => join(cwd, ".plans");

export function planDir(slug: string, cwd = process.cwd()): string {
  if (!slug) throw new Error("missing plan slug");
  const dir = join(plansDir(cwd), slug);
  if (!existsSync(dir))
    throw new Error(`.plans/${slug} not found; run agentic-smm new first`);
  return dir;
}

/** Reads `key: value` lines from the top of STATUS.md. */
export function statusField(dir: string, key: string): string | undefined {
  return read(join(dir, "STATUS.md"))
    .match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]
    ?.trim();
}

/** A checkpoint file counts as approved once it holds an `approved: yes` line. */
export const approved = (path: string) =>
  existsSync(path) && /^approved:\s*yes\b/im.test(read(path));
