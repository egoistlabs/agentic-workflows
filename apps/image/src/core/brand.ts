// Brand packs: the built-in default, project packs laid over it, the font file,
// and the per-project learnings file.
import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { read, readJson, root, statusField } from "./files.js";

export const defaultBrand = join(root, "brand", "default");

export type Tokens = Record<string, string>;

/** The pack a job uses: --brand, else ./brand in the project, else the default. */
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

/**
 * One pack's own tokens.json. Values must be strings (numbers are accepted and stringified).
 * An `image` object holds tokens for slides only (e.g. a light theme while videos stay dark);
 * it is laid over the pack's top-level tokens. Other tools ignore it.
 */
export function packTokens(dir: string): Tokens {
  const path = join(dir, "tokens.json");
  if (!existsSync(path))
    throw new Error(`brand pack ${dir} has no tokens.json`);
  const raw = readJson<unknown>(path);
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error(`${path} must be a JSON object of token: value`);
  const { image, ...top } = raw as Record<string, unknown>;
  if (
    image !== undefined &&
    (!image || typeof image !== "object" || Array.isArray(image))
  )
    throw new Error(`${path}: "image" must be an object of token: value`);
  const out: Tokens = {};
  for (const [k, v] of Object.entries({ ...top, ...(image as object) })) {
    if (typeof v !== "string" && typeof v !== "number")
      throw new Error(`${path}: token "${k}" must be a string or number`);
    out[k] = String(v);
  }
  return out;
}

const isDefault = (dir?: string) =>
  !dir || resolve(dir) === resolve(defaultBrand);

/** Default tokens with the project pack's tokens laid over them. */
export function loadTokens(dir?: string): Tokens {
  const base = packTokens(defaultBrand);
  return isDefault(dir) ? base : { ...base, ...packTokens(dir!) };
}

export interface TokenSources {
  /** Tokens the pack sets that agentic-image uses. */
  set: string[];
  /** Tokens the pack leaves out, filled from the default pack. */
  fromDefault: string[];
  /** Tokens the pack sets that agentic-image doesn't use (e.g. agentic-video's hookBg). */
  unused: string[];
}

/** Tokens agentic-image uses that the default pack leaves unset. */
const OPTIONAL_TOKENS = ["fontMono", "fontMonoFile"];

/** Which tokens a pack sets and which come from the default. */
export function tokenSources(dir: string): TokenSources {
  const base = Object.keys(packTokens(defaultBrand));
  if (isDefault(dir)) return { set: base, fromDefault: [], unused: [] };
  const own = Object.keys(packTokens(dir));
  const known = [...base, ...OPTIONAL_TOKENS];
  return {
    set: known.filter((k) => own.includes(k)),
    fromDefault: base.filter((k) => !own.includes(k)),
    unused: own.filter((k) => !known.includes(k)),
  };
}

/**
 * The font file the renderer loads: `fontFile` in the assets/ of the pack that
 * sets it. A pack that sets `font` without `fontFile` inherits the default's file,
 * which won't match its family; `fontWarning` says so. `mono` gives the optional
 * mono face's file (`fontMonoFile`), or undefined when no pack sets `fontMono`.
 */
export function fontPath(dir?: string): string;
export function fontPath(
  dir: string | undefined,
  mono: true,
): string | undefined;
export function fontPath(dir?: string, mono = false): string | undefined {
  const [fontKey, fileKey] = mono
    ? ["fontMono", "fontMonoFile"]
    : ["font", "fontFile"];
  const tokens = loadTokens(dir);
  if (mono && !tokens[fontKey]?.trim()) return undefined;
  const own: Tokens = isDefault(dir) ? {} : packTokens(dir!);
  const pack = own[fileKey] ? dir! : defaultBrand;
  return join(pack, "assets", tokens[fileKey] ?? "");
}

export function fontWarning(dir?: string): string | undefined {
  const own: Tokens = isDefault(dir) ? {} : packTokens(dir!);
  if (own.font && !own.fontFile)
    return `the pack sets font "${own.font}" but no fontFile, so the default's font file would load; add the font to ${join(dir!, "assets")} and set fontFile`;
  if (own.fontMono && !own.fontMonoFile)
    return `the pack sets fontMono "${own.fontMono}" but no fontMonoFile; add the font to ${join(dir!, "assets")} and set fontMonoFile`;
  for (const p of [fontPath(dir), fontPath(dir, true)])
    if (p && !existsSync(p)) return `font file ${p} not found`;
  return undefined;
}

/** Learnings live beside a project pack, or in .images/ when the default is in use. */
export const learningsPath = (cwd: string, brandDir: string) =>
  isDefault(brandDir)
    ? join(cwd, ".images", "learnings.md")
    : join(brandDir, "learnings.md");

/** Learnings file for an existing job (STATUS.md records it). */
export function jobLearnings(dir: string): string | undefined {
  const p = statusField(dir, "learnings");
  return p && existsSync(p) ? read(p).trim() : undefined;
}
