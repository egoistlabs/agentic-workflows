// face: tracks the speaker's face on assets/cut.mp4 → assets/face.json, so
// overlays (Zone) and captions are placed around it.
import { relative } from "node:path";
import { face } from "../core/index.js";

const slug = process.argv[2];
if (!slug) throw new Error("usage: face <slug>");
const r = await face(slug);
if (!r.file)
  console.log(`warning: ${r.reason}. Zones use the fixed boxes; QA will warn.`);
else
  console.log(
    `${r.frames} samples (${r.missing} without a face, filled) → ${relative(process.cwd(), r.file)}`,
  );
