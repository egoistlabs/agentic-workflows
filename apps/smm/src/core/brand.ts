// The creator's brand pack (brand.md, story-bank.md, learnings.md) and the
// learnings file a plan reads at every stage.
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { read, statusField } from "./files.js";

/**
 * The pack a plan uses: --brand, else ./brand in the creator's repo. The folder
 * may not exist yet: 00-brief drafts brand.md on the first run.
 */
export function resolveBrand(cwd: string, flag?: string): string {
  if (!flag) return join(cwd, "brand");
  const b = isAbsolute(flag) ? flag : resolve(cwd, flag);
  if (!existsSync(b)) throw new Error(`brand folder ${b} not found`);
  return b;
}

export const learningsPath = (brandDir: string) =>
  join(brandDir, "learnings.md");

/** Learnings file for an existing plan (STATUS.md records it). */
export function planLearnings(dir: string): string | undefined {
  const p = statusField(dir, "learnings");
  return p && existsSync(p) ? read(p).trim() : undefined;
}
