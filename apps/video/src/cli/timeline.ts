// timeline: builds 05-build/timeline.json from cues.json and the cut (talking-head, explainer).
import { relative } from "node:path";
import { buildTimeline } from "../core/index.js";

const slug = process.argv[2];
if (!slug) throw new Error("usage: timeline <slug>");
const r = buildTimeline(slug);
console.log(r.lines.join("\n"));
console.log(
  `cut ${r.cut.toFixed(2)}s, video ${r.duration.toFixed(2)}s, ${r.words} words → ${relative(process.cwd(), r.file)}`,
);
if (r.gaps.length)
  console.log(`R3 gaps (add overlay events or cues): ${r.gaps.join("; ")}`);
if (r.warnings.length)
  console.log(`X1 layout (adjust cues.json layout): ${r.warnings.join("; ")}`);
