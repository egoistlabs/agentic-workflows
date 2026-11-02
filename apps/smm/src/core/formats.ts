// Format manifests: one folder per format in formats/, each with a format.json
// and the brief template its pieces use. Adding a format means adding a folder.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { read, readJson, root } from "./files.js";

export interface Format {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  /** Brief template file in the format's folder (the piece's `brief` field). */
  brief: string;
  structures: string[];
  /** Sections the brief must fill in. */
  requiredFields: string[];
  /** Numbers `check` enforces (word counts, slide counts, tolerances). */
  limits: Record<string, number | boolean>;
  /** Where the hook goes: first 3 s, cover, headline, first line. */
  hookAt: string;
  /** What a piece's `size` counts. */
  sizeUnit: string;
  /** Who makes it, and the command 08-produce prints. */
  producer: {
    tool: string;
    format?: string;
    command?: string;
    /** Used while the tool does not exist yet. */
    fallback?: string;
    note?: string;
  };
  /** The files the producer hands back in asset.json. */
  files: {
    kind: "video" | "image" | "none";
    min: number;
    max: number;
    ext: string[];
    aspect: string[];
    numbered?: boolean;
  };
  /** The Facebook post type it is scheduled as. */
  postType: string;
  /** Metrics it is judged on, primary first. */
  metrics: string[];
  /** The production batch: its name and pieces per batch. */
  batch: { name: string; min?: number; max?: number; checklist?: string };
  /** Limits taken from memory that the Meta test run (build step 4) must confirm. */
  unconfirmed?: string[];
}

const formatsDir = join(root, "formats");

const REQUIRED: [keyof Format, "string" | "array" | "object"][] = [
  ["name", "string"],
  ["description", "string"],
  ["bestFor", "array"],
  ["brief", "string"],
  ["structures", "array"],
  ["requiredFields", "array"],
  ["limits", "object"],
  ["hookAt", "string"],
  ["sizeUnit", "string"],
  ["producer", "object"],
  ["files", "object"],
  ["postType", "string"],
  ["metrics", "array"],
  ["batch", "object"],
];

const kind = (v: unknown) =>
  Array.isArray(v) ? "array" : v === null ? "null" : typeof v;

export function loadFormat(id: string): Format {
  const path = join(formatsDir, id, "format.json");
  if (!existsSync(path)) throw new Error(`unknown format "${id}"`);
  const f = readJson<Record<string, unknown>>(path);
  const bad = REQUIRED.filter(([k, t]) => kind(f[k]) !== t).map(([k]) => k);
  if (bad.length)
    throw new Error(
      `formats/${id}/format.json: missing or wrong ${bad.join(", ")}`,
    );
  const format = { ...f, id } as unknown as Format;
  if (!format.producer.tool)
    throw new Error(`formats/${id}/format.json: producer.tool is missing`);
  if (!format.batch.name)
    throw new Error(`formats/${id}/format.json: batch.name is missing`);
  if (!existsSync(join(formatsDir, id, format.brief)))
    throw new Error(`formats/${id}: brief template ${format.brief} not found`);
  return format;
}

export const listFormats = (): Format[] =>
  readdirSync(formatsDir)
    .filter((d) => existsSync(join(formatsDir, d, "format.json")))
    .sort()
    .map(loadFormat);

export const formatBrief = (f: Format) => read(join(formatsDir, f.id, f.brief));
