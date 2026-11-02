// Layouts: an HTML template, its CSS and a declaration of its fields and limits.
// A job's own layouts (02-layout/layouts/<name>/) come before the shared ones (layouts/<name>/).
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { read, readJson, root } from "./files.js";

export const sharedLayouts = join(root, "layouts");
export const jobLayouts = (jobDir: string) =>
  join(jobDir, "02-layout", "layouts");

export interface TextField {
  type: "text";
  required?: boolean;
  /** Most words in the field. */
  maxWords: number;
  about?: string;
}

export interface ListField {
  type: "list";
  required?: boolean;
  /** Fewest and most entries. */
  min: number;
  max: number;
  /** Most words in each entry. */
  maxWords: number;
  about?: string;
}

export type Field = TextField | ListField;

export interface LayoutDecl {
  use: string;
  fields: Record<string, Field>;
  /** Whether a slide with this layout may or must have an image. */
  image: "none" | "optional" | "required";
}

export interface Layout {
  name: string;
  dir: string;
  source: "job" | "shared";
  decl: LayoutDecl;
  html: string;
  css: string;
}

const FILES = ["layout.json", "layout.html", "layout.css"];

/** Checks a declaration's shape, so a bad local layout fails with its own name. */
export function checkDecl(name: string, d: unknown): LayoutDecl {
  const where = `layout "${name}" (layout.json)`;
  const o = d as Partial<LayoutDecl>;
  if (!o || typeof o !== "object" || typeof o.fields !== "object" || !o.fields)
    throw new Error(`${where} must have "fields"`);
  if (!["none", "optional", "required"].includes(o.image as string))
    throw new Error(`${where}: "image" must be none, optional or required`);
  for (const [k, f] of Object.entries(o.fields)) {
    if (f.type === "text") {
      if (!(f.maxWords > 0))
        throw new Error(`${where}: field "${k}" needs maxWords`);
    } else if (f.type === "list") {
      if (!(f.maxWords > 0 && f.min >= 0 && f.max >= f.min))
        throw new Error(`${where}: list "${k}" needs maxWords, min and max`);
    } else
      throw new Error(`${where}: field "${k}" type must be "text" or "list"`);
  }
  return o as LayoutDecl;
}

function loadFrom(
  dir: string,
  name: string,
  source: Layout["source"],
): Layout | undefined {
  if (!existsSync(dir)) return undefined;
  const missing = FILES.filter((f) => !existsSync(join(dir, f)));
  if (missing.length)
    throw new Error(
      `layout "${name}" in ${dir} is missing ${missing.join(", ")}`,
    );
  return {
    name,
    dir,
    source,
    decl: checkDecl(name, readJson(join(dir, "layout.json"))),
    html: read(join(dir, "layout.html")),
    css: read(join(dir, "layout.css")),
  };
}

const okName = (name: string) => /^[a-z][a-z0-9-]*$/.test(name);

/** The job's own layout of that name if it has one, else the shared one, else undefined. */
export function findLayout(name: string, jobDir?: string): Layout | undefined {
  if (!okName(name)) return undefined;
  return (
    (jobDir && loadFrom(join(jobLayouts(jobDir), name), name, "job")) ||
    loadFrom(join(sharedLayouts, name), name, "shared")
  );
}

const dirs = (d: string) =>
  existsSync(d)
    ? readdirSync(d, { withFileTypes: true })
        .filter((e) => e.isDirectory() && okName(e.name))
        .map((e) => e.name)
    : [];

/** Every layout name a job can use, job-local ones included. */
export function layoutNames(jobDir?: string): string[] {
  return [
    ...new Set([
      ...(jobDir ? dirs(jobLayouts(jobDir)) : []),
      ...dirs(sharedLayouts),
    ]),
  ].sort();
}
