// Creating studies and working out where one stands: stage, checkpoints, log.
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BLIND,
  STAGES,
  loadSources,
  read,
  root,
  studiesDir,
  studyDir,
} from "./files.js";
import type { Stage } from "./types.js";

export function newStudy(name: string): string {
  if (!name) throw new Error("missing study name");
  const dest = join(studiesDir, name);
  if (existsSync(dest)) throw new Error(`.studies/${name} already exists`);
  cpSync(join(root, "template"), dest, { recursive: true });
  return dest;
}

export type Checkpoint =
  | { kind: "probe-sources"; unprobed: string[] }
  | { kind: "approve-sources"; table: string }
  | { kind: "sources-approved" }
  | { kind: "pick-target" };

export interface StudyState {
  name: string;
  dir: string;
  stage: Stage | "done";
  /** Stages 00b–03: must not open 00-brief/sealed.md. */
  blind: boolean;
  /** Last log lines from STATUS.md, for resuming. */
  recentLog: string[];
  checkpoint?: Checkpoint;
  instructions: string;
}

/** Reads STATUS.md and the stage files; throws if the study skipped a checkpoint. */
export function studyState(name: string): StudyState {
  const dir = studyDir(name);
  const status = readFileSync(join(dir, "STATUS.md"), "utf8");
  const stage = status.match(/^stage:\s*(\S+)/m)?.[1];
  if (!stage) throw new Error('STATUS.md has no "stage:" line');
  const recentLog = (status.split(/^## Log\s*$/m)[1] ?? "")
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(-5);
  if (stage === "done")
    return { name, dir, stage, blind: false, recentLog, instructions: "" };
  if (!STAGES.includes(stage as Stage))
    throw new Error(
      `unknown stage "${stage}"; expected one of ${STAGES.join(", ")}`,
    );
  const current = stage as Stage;

  const instructionsPath = join(dir, current, "INSTRUCTIONS.md");
  if (!existsSync(instructionsPath))
    throw new Error(`no INSTRUCTIONS.md for stage ${current}`);

  const sources = loadSources(dir);
  if (
    STAGES.indexOf(current) > STAGES.indexOf("00b-sources") &&
    !sources.approved
  ) {
    throw new Error(
      `stage is ${current} but 00b-sources/sources.md is not approved; set stage: 00b-sources and get approval`,
    );
  }

  let checkpoint: Checkpoint | undefined;
  if (current === "00b-sources") {
    const unprobed = sources.rows
      .filter((r) => !r.access || r.access === "?")
      .map((r) => r.key);
    if (sources.approved) checkpoint = { kind: "sources-approved" };
    else if (unprobed.length) checkpoint = { kind: "probe-sources", unprobed };
    else if (sources.rows.length)
      checkpoint = { kind: "approve-sources", table: sources.text };
  }
  if (
    current === "04-decide" &&
    existsSync(join(dir, "04-decide", "REVIEW.md")) &&
    !existsSync(join(dir, "04-decide", "decision.md"))
  ) {
    checkpoint = { kind: "pick-target" };
  }

  return {
    name,
    dir,
    stage: current,
    blind: BLIND.includes(current),
    recentLog,
    checkpoint,
    instructions: read(instructionsPath),
  };
}
