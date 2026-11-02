import { newVideo } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug] = pos;
const format = typeof flags.format === "string" ? flags.format : "motion-reel";
const brand = typeof flags.brand === "string" ? flags.brand : undefined;
if (!slug)
  throw new Error(
    "usage: new <slug> [--format motion-reel|talking-head|explainer|launch|showreel] [--brand <dir>]",
  );
const dir = newVideo(slug, format, brand);
console.log(`Created ${dir} (${format}). Next: agentic-video route ${slug}`);
