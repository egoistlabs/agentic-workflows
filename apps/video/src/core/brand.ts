// Brand packs: the built-in default, project overrides, the per-project
// learnings file, and a scan for brand sources in a repo without a pack.
import {
  appendFileSync,
  existsSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { loadFormat, read, readJson, root, statusField } from "./files.js";

export const defaultBrand = join(root, "brand", "default");

/** The pack a video uses: --brand, else ./brand in the project, else the default. */
export function resolveBrand(cwd: string, flag?: string): string {
  if (flag) {
    const b = isAbsolute(flag) ? flag : resolve(cwd, flag);
    if (!existsSync(join(b, "tokens.json")))
      throw new Error(`brand pack ${b} has no tokens.json`);
    return b;
  }
  const local = join(cwd, "brand");
  return existsSync(join(local, "tokens.json")) ? local : defaultBrand;
}

/** Default tokens with the project pack's tokens laid over them. */
export function brandTokens(brandDir?: string): Record<string, string> {
  const base = readJson<Record<string, string>>(
    join(defaultBrand, "tokens.json"),
  );
  if (!brandDir || brandDir === "none" || brandDir === defaultBrand)
    return base;
  return {
    ...base,
    ...readJson<Record<string, string>>(join(brandDir, "tokens.json")),
  };
}

/** Learnings live beside a project pack, or in .videos/ when the default is in use. */
export const learningsPath = (cwd: string, brandDir: string) =>
  brandDir === defaultBrand
    ? join(cwd, ".videos", "learnings.md")
    : join(brandDir, "learnings.md");

/** Learnings file for an existing video (STATUS.md records it). */
export function videoLearnings(dir: string): string | undefined {
  const p = statusField(dir, "learnings");
  return p && existsSync(p) ? read(p).trim() : undefined;
}

export function appendLearning(dir: string, note: string): string {
  const p = statusField(dir, "learnings");
  if (!p) throw new Error('STATUS.md has no "learnings:" line');
  if (!existsSync(p))
    appendFileSync(
      p,
      "# Learnings\n\nWhat the human approved, rejected or corrected. Read before every brief, storyboard and build.\n\n",
    );
  const date = new Date().toISOString().slice(0, 10);
  const slug = relative(join(dir, ".."), dir);
  appendFileSync(p, `- ${date} (${slug}): ${note.trim()}\n`);
  return p;
}

const GROUPS: Record<string, string> = {
  core: "## Core rules",
  motion: "## Motion rules",
  "talking-head": "## Talking-head rules",
  explainer: "## Explainer rules",
};

/**
 * Promotes one lesson into a rule group of MOTION_PHILOSOPHY.md, only ever on the
 * maintainer's command. `lesson` is the text, or the number of a line in learnings.md.
 * The group defaults to the video format's own group. learnings.md is left as is.
 */
export function promoteLesson(
  dir: string,
  lesson: string,
  group?: string,
): { file: string; group: string; line: string } {
  let text = lesson.trim();
  const project = basename(resolve(dir, "..", ".."));
  let source = relative(join(dir, ".."), dir);
  if (/^\d+$/.test(text)) {
    const p = statusField(dir, "learnings");
    const lines =
      p && existsSync(p)
        ? read(p)
            .split("\n")
            .filter((l) => l.startsWith("- "))
        : [];
    const hit = lines[Number(text) - 1];
    if (!hit)
      throw new Error(
        `learnings.md has no lesson ${text} (it has ${lines.length})`,
      );
    // Credit the video the lesson came from, not the one promoting it.
    source = hit.match(/^- \d{4}-\d{2}-\d{2} \(([^)]*)\):/)?.[1] ?? source;
    text = hit.replace(/^- \d{4}-\d{2}-\d{2} \([^)]*\):\s*/, "");
  }
  if (!text) throw new Error("empty lesson");
  const rules = loadFormat(statusField(dir, "format") ?? "").rules;
  const g = group ?? rules.find((r) => r !== "core") ?? "core";
  const heading = GROUPS[g];
  if (!heading)
    throw new Error(
      `unknown rule group "${g}" (${Object.keys(GROUPS).join(", ")})`,
    );
  const file = join(root, "MOTION_PHILOSOPHY.md");
  const doc = read(file);
  const at = doc.indexOf(heading);
  if (at < 0)
    throw new Error(`MOTION_PHILOSOPHY.md has no "${heading}" section`);
  const next = doc.indexOf("\n## ", at + heading.length);
  const end = next < 0 ? doc.length : next;
  const date = new Date().toISOString().slice(0, 10);
  const line = `- **Promoted (${project}/${source}, ${date}):** ${text}`;
  writeFileSync(
    file,
    `${doc.slice(0, end).trimEnd()}\n${line}\n${doc.slice(end)}`,
  );
  return { file, group: g, line };
}

const SKIP = new Set([
  "node_modules",
  ".git",
  ".videos",
  "dist",
  "build",
  "out",
  ".next",
  "videos",
]);
const PATTERNS: [string, RegExp][] = [
  [
    "theme",
    /^(tailwind\.config\.\w+|theme\.\w+|tokens?\.(json|css|ts|js)|design-tokens.*|variables\.(s?css))$/i,
  ],
  ["css", /^(globals?|index|app|main|styles?)\.(s?css)$/i],
  [
    "logo",
    /(logo|wordmark|brandmark|favicon|icon|apple-touch-icon).*\.(svg|png|webp|ico)$/i,
  ],
  ["font", /\.(woff2?|ttf|otf)$/i],
  ["copy", /^(README|ABOUT|BRAND|STYLEGUIDE|VOICE)(\.\w+)?$/i],
  [
    "site",
    /^(index\.html|layout\.(tsx|jsx)|page\.(tsx|jsx)|manifest\.json|site\.webmanifest)$/i,
  ],
];

/** Files in the repo that likely hold colours, fonts, logos or voice. */
export function scanBrand(cwd: string, maxDepth = 5): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  const walk = (d: string, depth: number) => {
    if (depth > maxDepth) return;
    for (const name of readdirSync(d)) {
      if (SKIP.has(name) || (name.startsWith(".") && name !== ".github"))
        continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p, depth + 1);
      else
        for (const [kind, re] of PATTERNS)
          if (re.test(name)) (found[kind] ??= []).push(relative(cwd, p));
    }
  };
  walk(cwd, 0);
  for (const k in found) found[k] = found[k]!.slice(0, 20);
  return found;
}
