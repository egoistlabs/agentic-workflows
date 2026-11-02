// Creating plans and working out where one stands: stage, checkpoint, log.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { learningsPath, resolveBrand } from "./brand.js";
import {
  approved,
  loadStages,
  planDir,
  plansDir,
  read,
  root,
  statusField,
} from "./files.js";

export interface PlanOptions {
  weeks?: number;
  perWeek?: number;
  brand?: string;
}

const count = (name: string, n: number) => {
  if (!Number.isInteger(n) || n < 1)
    throw new Error(`--${name} must be a whole number above 0`);
  return n;
};

/** Copies every stage folder into .plans/<slug>/ and writes STATUS.md. */
export function newPlan(
  slug: string,
  opts: PlanOptions = {},
  cwd = process.cwd(),
): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug ?? ""))
    throw new Error("plan slug must be lowercase letters, digits and dashes");
  const weeks = count("weeks", opts.weeks ?? 4);
  const perWeek = count("per-week", opts.perWeek ?? 7);
  const dest = join(plansDir(cwd), slug);
  if (existsSync(dest)) throw new Error(`.plans/${slug} already exists`);
  const brand = resolveBrand(cwd, opts.brand);
  const { stages } = loadStages();
  mkdirSync(dest, { recursive: true });
  for (const stage of stages)
    cpSync(join(root, "template", stage), join(dest, stage), {
      recursive: true,
    });
  writeFileSync(
    join(dest, "STATUS.md"),
    `# Status\n\nweeks: ${weeks}\nper-week: ${perWeek}\nbrand: ${brand}\nlearnings: ${learningsPath(brand)}\nstage: ${stages[0]}\n\n## Log\n`,
  );
  return dest;
}

export type Checkpoint = { stage: string; file: string; exists: boolean };

export interface PlanState {
  slug: string;
  dir: string;
  stage: string;
  next?: string;
  weeks: number;
  perWeek: number;
  brand: string;
  learnings: string;
  recentLog: string[];
  /** The current stage's checkpoint, while it is not approved. */
  checkpoint?: Checkpoint;
  /** The current stage's checkpoint file once it is approved. */
  approvedFile?: string;
  instructions: string;
}

/** Reads STATUS.md; throws if an earlier checkpoint was skipped. */
export function planState(slug: string, cwd = process.cwd()): PlanState {
  const dir = planDir(slug, cwd);
  const { stages, checkpoints } = loadStages();
  const stage = statusField(dir, "stage");
  if (!stage) throw new Error('STATUS.md has no "stage:" line');
  const recentLog = (
    read(join(dir, "STATUS.md")).split(/^## Log\s*$/m)[1] ?? ""
  )
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(-5);
  const base = {
    slug,
    dir,
    stage,
    weeks: Number(statusField(dir, "weeks") ?? 4),
    perWeek: Number(statusField(dir, "per-week") ?? 7),
    brand: statusField(dir, "brand") ?? "",
    learnings: statusField(dir, "learnings") ?? "",
    recentLog,
  };

  const i = stage === "done" ? stages.length : stages.indexOf(stage);
  if (i < 0)
    throw new Error(
      `unknown stage "${stage}"; expected one of ${stages.join(", ")}, done`,
    );
  for (const earlier of stages.slice(0, i)) {
    const file = checkpoints[earlier];
    if (file && !approved(join(dir, earlier, file)))
      throw new Error(
        `stage is ${stage} but ${earlier}/${file} is not approved; set stage: ${earlier} and get approval`,
      );
  }
  if (stage === "done") return { ...base, instructions: "" };

  const file = checkpoints[stage];
  const path = file ? join(dir, stage, file) : undefined;
  const isApproved = !!path && approved(path);
  return {
    ...base,
    next: stages[i + 1],
    checkpoint:
      file && !isApproved
        ? { stage, file, exists: existsSync(path!) }
        : undefined,
    approvedFile: isApproved ? file : undefined,
    instructions: read(join(dir, stage, "INSTRUCTIONS.md")),
  };
}
