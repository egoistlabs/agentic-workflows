// render <slug> [--draft]: the next version into 03-render/v<n>/, one slide at a time,
// at low priority. --draft renders into 03-render/draft/ before copy approval; never a version.
import { getPriority, setPriority } from "node:os";
import { relative } from "node:path";
import { renderJob } from "../renderer/render.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug] = pos;
if (!slug) throw new Error("usage: render <slug> [--draft]");
// Low priority for this process and the browser it starts (keeps small machines usable).
try {
  if (getPriority() < 10) setPriority(10);
} catch {
  // Not allowed here: render at normal priority.
}
const r = await renderJob(slug, { draft: flags.draft === true });
const rel = relative(process.cwd(), r.dir) || r.dir;
console.log(
  r.version
    ? `Rendered v${r.version}: ${r.files.length} slides in ${rel}/`
    : `Rendered a DRAFT (not a version, not for approval): ${r.files.length} slides in ${rel}/`,
);
for (const f of r.files) console.log(`  ${relative(process.cwd(), f) || f}`);
console.log(
  r.version
    ? `Look at every slide at full size, then write 03-render/visuals.md (see 03-render/INSTRUCTIONS.md).`
    : `Copy isn't approved until 01-copy/copy.md has "approved: yes"; render a version after that.`,
);
