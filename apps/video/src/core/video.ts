// Creating videos and working out where one stands: stage, checkpoint, log.
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { learningsPath, resolveBrand } from "./brand.js";
import {
  type Format,
  type Stage,
  videoDir,
  videosDir,
  loadFormat,
  read,
  root,
  statusField,
} from "./files.js";

export function newVideo(
  slug: string,
  formatName: string,
  brand?: string,
  cwd = process.cwd(),
): string {
  if (!slug) throw new Error("missing video slug");
  const format = loadFormat(formatName);
  const dest = join(videosDir(cwd), slug);
  if (existsSync(dest)) throw new Error(`.videos/${slug} already exists`);
  for (const stage of format.stages)
    cpSync(join(root, "template", stage), join(dest, stage), {
      recursive: true,
    });
  mkdirSync(join(dest, "assets"), { recursive: true });

  const b = resolveBrand(cwd, brand);
  if (existsSync(join(b, "assets")))
    cpSync(join(b, "assets"), join(dest, "assets", "brand"), {
      recursive: true,
    });
  writeFileSync(
    join(dest, "STATUS.md"),
    `# Status\n\nformat: ${format.name}\nbrand: ${b}\nlearnings: ${learningsPath(cwd, b)}\nstage: ${format.stages[0]}\n\n## Log\n`,
  );
  return dest;
}

export type Checkpoint = { stage: Stage; file: string; exists: boolean };

export interface VideoState {
  slug: string;
  dir: string;
  format: Format;
  stage: Stage | "done";
  next?: Stage;
  recentLog: string[];
  checkpoint?: Checkpoint;
  instructions: string;
}

const approved = (path: string) =>
  existsSync(path) && /^approved:\s*yes\b/im.test(read(path));

/** Reads STATUS.md; throws if an earlier checkpoint was skipped. */
export function videoState(slug: string, cwd = process.cwd()): VideoState {
  const dir = videoDir(slug, cwd);
  const format = loadFormat(statusField(dir, "format") ?? "");
  const stage = statusField(dir, "stage");
  if (!stage) throw new Error('STATUS.md has no "stage:" line');
  const recentLog = (
    read(join(dir, "STATUS.md")).split(/^## Log\s*$/m)[1] ?? ""
  )
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(-5);
  if (stage === "done")
    return { slug, dir, format, stage, recentLog, instructions: "" };
  const i = format.stages.indexOf(stage as Stage);
  if (i < 0)
    throw new Error(
      `stage "${stage}" is not part of format ${format.name}: ${format.stages.join(", ")}`,
    );
  const current = stage as Stage;

  for (const earlier of format.stages.slice(0, i)) {
    const file = format.checkpoints[earlier];
    if (file && !approved(join(dir, earlier, file)))
      throw new Error(
        `stage is ${current} but ${earlier}/${file} is not approved; set stage: ${earlier} and get approval`,
      );
  }

  const file = format.checkpoints[current];
  const checkpoint =
    file && !approved(join(dir, current, file))
      ? { stage: current, file, exists: existsSync(join(dir, current, file)) }
      : undefined;

  return {
    slug,
    dir,
    format,
    stage: current,
    next: format.stages[i + 1],
    recentLog,
    checkpoint,
    instructions: read(join(dir, current, "INSTRUCTIONS.md")),
  };
}
