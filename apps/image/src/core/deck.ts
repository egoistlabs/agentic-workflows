// The deck: 02-layout/deck.json, one entry per slide in posting order.
// Validation checks it against each layout's declared fields and limits.
import { existsSync } from "node:fs";
import { extname, isAbsolute, join, normalize, relative, sep } from "node:path";
import { readJson } from "./files.js";
import { findLayout, layoutNames, type Layout } from "./layouts.js";

export interface DeckImage {
  /** `images/<file>` (relative to 02-layout/) or `brand:<file>` (in the brand's assets/). */
  src: string;
  /** `cover` fills the frame and trims the overflow; `contain` shows it whole. Default cover. */
  crop?: "cover" | "contain";
  /** The focal point, `x% y%`. Default `50% 50%`. */
  position?: string;
  /** What the image shows, for screen readers. */
  alt?: string;
}

export interface DeckSlide {
  layout: string;
  fields: Record<string, string | string[]>;
  image?: DeckImage;
}

export interface Deck {
  slides: DeckSlide[];
}

export interface ResolvedImage {
  /** Absolute path on disk. */
  file: string;
  /** Path the slide server serves it at. */
  url: string;
  crop: "cover" | "contain";
  position: string;
  alt: string;
}

export interface ResolvedSlide {
  /** 1-based, in posting order. */
  n: number;
  layout: Layout;
  fields: Record<string, string | string[]>;
  image?: ResolvedImage;
}

export const deckPath = (jobDir: string) =>
  join(jobDir, "02-layout", "deck.json");

/** Words that count: runs with a letter or digit, so dashes and emoji don't. */
export const wordCount = (s: string) =>
  s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

const IMAGE_TYPES = [".png", ".jpg", ".jpeg", ".webp"];
const POSITION = /^(\d{1,3}(?:\.\d+)?)% (\d{1,3}(?:\.\d+)?)%$/;
const SLIDE_KEYS = ["layout", "fields", "image"];
const IMAGE_KEYS = ["src", "crop", "position", "alt"];

const inside = (dir: string, file: string) => {
  const r = relative(dir, file);
  return r !== "" && !r.startsWith("..") && !isAbsolute(r);
};

function resolveImage(
  img: DeckImage,
  jobDir: string,
  brandDir: string,
  err: (m: string) => void,
): ResolvedImage | undefined {
  if (!img || typeof img !== "object" || typeof img.src !== "string") {
    err('image needs "src"');
    return undefined;
  }
  for (const k of Object.keys(img))
    if (!IMAGE_KEYS.includes(k))
      err(`image has unknown key "${k}" (${IMAGE_KEYS.join(", ")})`);
  const crop = img.crop ?? "cover";
  if (crop !== "cover" && crop !== "contain")
    err(`image crop "${crop}" must be cover or contain`);
  const position = img.position ?? "50% 50%";
  const m = POSITION.exec(position);
  if (!m || Number(m[1]) > 100 || Number(m[2]) > 100)
    err(`image position "${position}" must be "x% y%", each 0–100`);
  if (img.alt !== undefined && typeof img.alt !== "string")
    err("image alt must be text");

  const brand = img.src.startsWith("brand:");
  const base = brand ? join(brandDir, "assets") : join(jobDir, "02-layout");
  const rel = brand ? img.src.slice("brand:".length) : img.src;
  const file = normalize(join(base, rel));
  if (!inside(base, file) || (!brand && !inside(join(base, "images"), file))) {
    err(
      `image src "${img.src}" must be images/<file> in 02-layout, or brand:<file> in the brand's assets/`,
    );
    return undefined;
  }
  if (!IMAGE_TYPES.includes(extname(file).toLowerCase()))
    err(`image src "${img.src}" must be ${IMAGE_TYPES.join(", ")}`);
  if (!existsSync(file)) err(`image ${img.src} not found (${file})`);
  const url = `/${brand ? "brand" : "job"}/${relative(base, file).split(sep).map(encodeURIComponent).join("/")}`;
  return {
    file,
    url,
    crop: crop as ResolvedImage["crop"],
    position,
    alt: img.alt ?? "",
  };
}

function checkFields(
  layout: Layout,
  fields: Record<string, unknown>,
  err: (m: string) => void,
) {
  const decl = layout.decl.fields;
  for (const k of Object.keys(fields))
    if (!decl[k])
      err(
        `unknown field "${k}"; ${layout.name} has ${Object.keys(decl).join(", ")}`,
      );
  for (const [k, f] of Object.entries(decl)) {
    const v = fields[k];
    const empty =
      v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) {
      if (f.required) err(`missing required field "${k}"`);
      continue;
    }
    if (f.type === "text") {
      if (typeof v !== "string") {
        err(`field "${k}" must be text`);
        continue;
      }
      const n = wordCount(v);
      if (n > f.maxWords)
        err(`field "${k}" has ${n} words; ${layout.name} allows ${f.maxWords}`);
    } else {
      if (!Array.isArray(v) || v.some((e) => typeof e !== "string" || !e)) {
        err(`field "${k}" must be a list of text entries`);
        continue;
      }
      if (v.length < f.min || v.length > f.max)
        err(
          `field "${k}" has ${v.length} entries; ${layout.name} allows ${f.min}–${f.max}`,
        );
      v.forEach((e, i) => {
        const n = wordCount(e as string);
        if (n > f.maxWords)
          err(
            `field "${k}" entry ${i + 1} has ${n} words; ${layout.name} allows ${f.maxWords} per entry`,
          );
      });
    }
  }
}

/**
 * Checks a deck against the layouts it names and resolves its layouts and images.
 * Throws one error listing every problem, each naming its slide.
 */
export function validateDeck(
  deck: unknown,
  jobDir: string,
  brandDir: string,
  format?: string,
): ResolvedSlide[] {
  const errors: string[] = [];
  const d = deck as Partial<Deck>;
  if (!d || typeof d !== "object" || !Array.isArray(d.slides))
    throw new Error('deck.json must be an object with a "slides" list');
  if (d.slides.length === 0) errors.push("deck.json has no slides");
  if (format === "image" && d.slides.length > 1)
    errors.push(`an image job has one slide; deck.json has ${d.slides.length}`);

  const out: ResolvedSlide[] = [];
  d.slides.forEach((s, i) => {
    const n = i + 1;
    const label = `slide ${n}${s && typeof s.layout === "string" ? ` (${s.layout})` : ""}`;
    const err = (m: string) => errors.push(`${label}: ${m}`);
    if (!s || typeof s !== "object") return err("must be an object");
    for (const k of Object.keys(s))
      if (!SLIDE_KEYS.includes(k))
        err(`unknown key "${k}" (${SLIDE_KEYS.join(", ")})`);
    if (typeof s.layout !== "string") return err('needs "layout"');
    let layout: Layout | undefined;
    try {
      layout = findLayout(s.layout, jobDir);
    } catch (e) {
      return err((e as Error).message);
    }
    if (!layout)
      return err(
        `unknown layout "${s.layout}"; available: ${layoutNames(jobDir).join(", ")}`,
      );
    const fields = s.fields ?? {};
    if (typeof fields !== "object" || Array.isArray(fields))
      return err('"fields" must be an object of field: text');
    checkFields(layout, fields, err);
    let image: ResolvedImage | undefined;
    if (s.image !== undefined) {
      if (layout.decl.image === "none")
        err(`${layout.name} has no image; remove "image"`);
      else image = resolveImage(s.image, jobDir, brandDir, err);
    } else if (layout.decl.image === "required")
      err(`${layout.name} needs an image`);
    out.push({ n, layout, fields, image });
  });
  if (errors.length)
    throw new Error(`deck.json is not valid:\n  ${errors.join("\n  ")}`);
  return out;
}

/** Reads and validates 02-layout/deck.json. */
export function loadDeck(
  jobDir: string,
  brandDir: string,
  format?: string,
): ResolvedSlide[] {
  const p = deckPath(jobDir);
  if (!existsSync(p))
    throw new Error(
      `${p} not found; write it in 02-layout (see its INSTRUCTIONS.md)`,
    );
  let deck: unknown;
  try {
    deck = readJson(p);
  } catch (e) {
    throw new Error(`${p} is not valid JSON: ${(e as Error).message}`);
  }
  return validateDeck(deck, jobDir, brandDir, format);
}
