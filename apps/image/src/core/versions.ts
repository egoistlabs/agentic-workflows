// Render versions: 03-render/v1, v2… (never overwritten) and 03-render/draft.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { approved } from "./job.js";

export const renderDir = (jobDir: string) => join(jobDir, "03-render");
export const draftDir = (jobDir: string) => join(renderDir(jobDir), "draft");
export const versionDir = (jobDir: string, n: number) =>
  join(renderDir(jobDir), `v${n}`);

/** Version numbers that exist, ascending. */
export function versions(jobDir: string): number[] {
  const d = renderDir(jobDir);
  if (!existsSync(d)) return [];
  return readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^v\d+$/.test(e.name))
    .map((e) => Number(e.name.slice(1)))
    .sort((a, b) => a - b);
}

/** The next free version number: one past the highest, so a gap is never refilled. */
export const nextVersion = (jobDir: string) =>
  (versions(jobDir).at(-1) ?? 0) + 1;

export const copyApproved = (jobDir: string) =>
  approved(join(jobDir, "01-copy", "copy.md"));

/** `01.png`, `02.png`… in posting order. */
export const slideFile = (n: number) => `${String(n).padStart(2, "0")}.png`;
