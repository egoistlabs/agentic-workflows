// silences: lists the silences in a clip (cached in 03-source/silences.json).
import { join } from "node:path";
import { videoDir, loadKeep, silences } from "../core/index.js";

const [slug, clip] = process.argv.slice(2);
if (!slug)
  throw new Error(
    "usage: silences <slug> [assets/<clip>] (default: the clip in keep.json)",
  );
const dir = videoDir(slug);
const list = silences(dir, clip ? join(dir, clip) : loadKeep(dir).clip);
for (const [s, e] of list)
  console.log(`${s.toFixed(2)}–${e.toFixed(2)}  ${(e - s).toFixed(2)}s`);
console.log(
  `${list.length} silences → .videos/${slug}/03-source/silences.json`,
);
