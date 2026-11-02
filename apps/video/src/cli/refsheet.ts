// refsheet: contact sheets and scene-cut times for a reference video (file or URL).
import { relative } from "node:path";
import { refsheet } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug, src] = pos;
if (!slug || !src)
  throw new Error(
    "usage: refsheet <slug> <file|url> [--fps 1] [--name <folder>] [--threshold 4]",
  );
const r = refsheet(slug, src, {
  fps: typeof flags.fps === "string" ? Number(flags.fps) : undefined,
  name: typeof flags.name === "string" ? flags.name : undefined,
  threshold:
    typeof flags.threshold === "string" ? Number(flags.threshold) : undefined,
});
const dir = relative(process.cwd(), r.dir);
console.log(
  `${r.sheets.length} sheets, ${r.cuts.length} scene cuts → ${dir}/ (look at every sheet; cuts in cuts.md)`,
);
