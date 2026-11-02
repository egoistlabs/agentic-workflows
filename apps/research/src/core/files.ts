// Study paths, brief and sources.md parsing, item files, CSV and STATUS.md.
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  appendFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type {
  Brief,
  Item,
  RegistryEntry,
  SourcePlan,
  SourceRow,
  Stage,
} from "./types.js";

/** Repo root; the same from src/core (tsx) and dist/core (built). */
export const root = resolve(import.meta.dirname, "..", "..");
export const studiesDir = join(root, ".studies");

export const STAGES: Stage[] = [
  "00-brief",
  "00b-sources",
  "01-collect",
  "02-code",
  "03-cluster",
  "04-decide",
];
// Stages that must not read 00-brief/sealed.md.
export const BLIND: Stage[] = [
  "00b-sources",
  "01-collect",
  "02-code",
  "03-cluster",
];
// Added to every study so search terms are never only our own guesses.
export const OPEN_PHRASES = [
  "frustrated",
  "wish",
  "why does",
  "hate",
  "worth it",
];

export function studyDir(name: string | undefined): string {
  if (!name) throw new Error("missing study name");
  const dir = join(studiesDir, name);
  if (!existsSync(dir)) throw new Error(`no study at .studies/${name}`);
  return dir;
}

export const read = (path: string): string =>
  existsSync(path) ? readFileSync(path, "utf8") : "";
export const ensureDir = (path: string): void => {
  mkdirSync(path, { recursive: true });
};

/** Lines of a "## Title" section, without bullets, quotes or HTML comments. */
export function section(text: string, title: string): string[] {
  const body =
    (text.split(new RegExp(`^## ${title}\\s*$`, "m"))[1] ?? "").split(
      /^## /m,
    )[0] ?? "";
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .split("\n")
    .map((l) =>
      l
        .replace(/^[-*]\s*/, "")
        .trim()
        .replace(/^"(.*)"$/, "$1"),
    )
    .filter(Boolean);
}

/** "key: value" lines, lowercased keys. */
export function keyValues(lines: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) out[m[1]!.trim().toLowerCase()] = m[2]!.trim();
  }
  return out;
}

export function loadBrief(dir: string): Brief {
  const text = read(join(dir, "00-brief", "brief.md"));
  const budget = keyValues(section(text, "Budget"));
  const window = keyValues(section(text, "Time window"));
  const audience = keyValues(section(text, "Target audience"));
  const months = Number(window["months"] ?? 12);
  return {
    text,
    maxItems: Number(budget["max items"] ?? 150),
    maxChars: Number(budget["max chars per item"] ?? 800),
    since: window["since"]
      ? new Date(window["since"])
      : new Date(Date.now() - months * 30.4 * 864e5),
    audienceWords: [audience["words they use"], audience["tools"]]
      .filter((v): v is string => Boolean(v))
      .flatMap((v) => v.split(","))
      .map((w) => w.trim().replace(/^"|"$/g, "").toLowerCase())
      .filter(Boolean),
  };
}

export const rowKey = (row: { source: string; target?: string }): string =>
  [row.source, row.target].filter(Boolean).join(":");

/** 00b-sources/sources.md: approval flag, secondhand cap, the table, and pain phrases. */
export function loadSources(dir: string): SourcePlan {
  const text = read(join(dir, "00b-sources", "sources.md"));
  const meta = keyValues(
    text.split("\n").filter((l) => /^(approved|secondhand cap):/i.test(l)),
  );
  const rows: SourceRow[] = [];
  let header: string[] | undefined;
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("|")) {
      header = undefined;
      continue;
    }
    const cells = line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (!header) {
      header = cells.map((c) => c.toLowerCase());
      continue;
    }
    const cell = (name: string) => cells[header!.indexOf(name)] ?? "";
    if (!cell("source")) continue;
    const row = {
      source: cell("source"),
      target: cell("target"),
      audienceGroup: cell("audience group"),
      voice: cell("voice"),
      reach: cell("reach"),
      access: cell("access"),
      quota: Number(cell("quota")) || 0,
    };
    rows.push({ ...row, key: rowKey(row) });
  }
  return {
    text,
    approved: /^yes$/i.test(meta["approved"] ?? ""),
    secondhandCap: parseFloat(meta["secondhand cap"] ?? "20") / 100,
    rows,
    phrases: [...new Set([...section(text, "Pain phrases"), ...OPEN_PHRASES])],
  };
}

export function loadRegistry(): RegistryEntry[] {
  return JSON.parse(
    readFileSync(join(root, "sources", "registry.json"), "utf8"),
  ) as RegistryEntry[];
}

/** Item files: "---\nkey: value\n---\n\nbody". */
export function parseItem(text: string): Omit<Item, "file"> {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const kv = line.match(/^([\w-]+):\s?(.*)$/);
    if (kv) meta[kv[1]!] = kv[2]!;
  }
  return { meta, body: m[2]!.trim() };
}

export function formatItem(
  meta: Record<string, unknown>,
  title: string,
  body: string,
): string {
  const fm = Object.entries(meta)
    .map(([k, v]) => `${k}: ${String(v ?? "").replace(/\n/g, " ")}`)
    .join("\n");
  return `---\n${fm}\n---\n\n${title ? `# ${title}\n\n` : ""}${body}\n`;
}

export function readItems(folder: string): Item[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((file) => ({
      file,
      ...parseItem(readFileSync(join(folder, file), "utf8")),
    }));
}

export function writeItem(folder: string, file: string, content: string): void {
  writeFileSync(join(folder, file), content);
}

export function logStatus(dir: string, line: string): void {
  const date = new Date().toISOString().slice(0, 10);
  appendFileSync(join(dir, "STATUS.md"), `- ${date}: ${line}\n`);
}

export function tally(values: (string | undefined)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v || "unknown"] = (out[v || "unknown"] ?? 0) + 1;
  return out;
}

export const fmtTally = (t: Record<string, number>): string =>
  Object.entries(t)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const endRow = () => {
    row.push(cell);
    cell = "";
    if (row.some((v) => v !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else cell += c;
  }
  endRow();
  const [header = [], ...data] = rows;
  return data.map((r) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])),
  );
}
