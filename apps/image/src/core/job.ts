// Creating jobs and working out where one stands: stage, checkpoints, log.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { learningsPath, resolveBrand } from "./brand.js";
import {
  type Checkpoint,
  type Format,
  type SizeName,
  checkFormat,
  checkSize,
  imagesDir,
  jobDir,
  read,
  root,
  stageMap,
  statusField,
} from "./files.js";

export interface NewJobOptions {
  format?: string;
  size?: string;
  brand?: string;
}

/** Copies the stage folders into .images/<slug>/ and writes STATUS.md. */
export function newJob(
  slug: string,
  opts: NewJobOptions = {},
  cwd = process.cwd(),
): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug ?? ""))
    throw new Error(
      `bad slug "${slug ?? ""}": use lowercase letters, digits and hyphens`,
    );
  const format = checkFormat(opts.format ?? "carousel");
  const size = checkSize(opts.size ?? "portrait");
  const dest = join(imagesDir(cwd), slug);
  if (existsSync(dest)) throw new Error(`.images/${slug} already exists`);
  const b = resolveBrand(cwd, opts.brand);
  const { stages } = stageMap();
  mkdirSync(dest, { recursive: true });
  for (const stage of stages)
    cpSync(join(root, "template", stage), join(dest, stage), {
      recursive: true,
    });
  writeFileSync(
    join(dest, "STATUS.md"),
    `# Status\n\nformat: ${format}\nsize: ${size}\nbrand: ${b}\nlearnings: ${learningsPath(cwd, b)}\nstage: ${stages[0]}\n\n## Log\n`,
  );
  return dest;
}

export interface CheckpointState extends Checkpoint {
  stage: string;
  approved: boolean;
  exists: boolean;
}

export interface JobState {
  slug: string;
  dir: string;
  format: Format;
  size: SizeName;
  brand: string;
  stage: string;
  next?: string;
  recentLog: string[];
  /** Every checkpoint in stage order, with whether it is approved. */
  checkpoints: CheckpointState[];
  /** The current stage's checkpoint, while it is not approved. */
  checkpoint?: CheckpointState;
  instructions: string;
}

export const approved = (path: string) =>
  existsSync(path) && /^approved:\s*yes\b/im.test(read(path));

/** Reads STATUS.md; throws if an earlier checkpoint was skipped. */
export function jobState(slug: string, cwd = process.cwd()): JobState {
  const dir = jobDir(slug, cwd);
  const format = checkFormat(statusField(dir, "format") ?? "");
  const size = checkSize(statusField(dir, "size") ?? "");
  const brand = statusField(dir, "brand") ?? "";
  const stage = statusField(dir, "stage");
  if (!stage) throw new Error('STATUS.md has no "stage:" line');
  const recentLog = (
    read(join(dir, "STATUS.md")).split(/^## Log\s*$/m)[1] ?? ""
  )
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(-5);

  const map = stageMap();
  const checkpoints = map.stages.flatMap((s) => {
    const c = map.checkpoints[s];
    if (!c) return [];
    const path = join(dir, s, c.file);
    return [
      { ...c, stage: s, approved: approved(path), exists: existsSync(path) },
    ];
  });
  const base = { slug, dir, format, size, brand, recentLog, checkpoints };

  // "done" is past every stage, so every checkpoint must be approved.
  const i = stage === "done" ? map.stages.length : map.stages.indexOf(stage);
  if (i < 0)
    throw new Error(
      `unknown stage "${stage}" in STATUS.md: ${[...map.stages, "done"].join(", ")}`,
    );
  for (const c of checkpoints)
    if (map.stages.indexOf(c.stage) < i && !c.approved)
      throw new Error(
        `stage is ${stage} but ${c.stage}/${c.file} (${c.approves}) is not approved; set stage: ${c.stage} and get the human's approval`,
      );
  if (stage === "done") return { ...base, stage, instructions: "" };

  return {
    ...base,
    stage,
    next: map.stages[i + 1],
    checkpoint: checkpoints.find((c) => c.stage === stage && !c.approved),
    instructions: read(join(dir, stage, "INSTRUCTIONS.md")),
  };
}
