// matte: cuts the speaker out of assets/cut.mp4 → assets/cut-alpha.webm, so the
// explainer's split card shows the head breaking out above its edge.
import { relative } from "node:path";
import { matte } from "../core/index.js";

const slug = process.argv[2];
if (!slug) throw new Error("usage: matte <slug>");
const r = await matte(slug);
if (!r.file)
  console.log(
    `warning: ${r.reason}. Split cards frame the whole head; QA will warn.`,
  );
else
  console.log(
    `${r.frames} frames → ${relative(process.cwd(), r.file)}. Run agentic-video timeline ${slug} again to frame the break-out.`,
  );
