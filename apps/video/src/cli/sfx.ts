// sfx: synthesises the format's SFX palette into assets/sfx/.
import { relative } from "node:path";
import { sfx } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug] = pos;
if (!slug) throw new Error("usage: sfx <slug> [--palette soft|loud]");
const r = sfx(
  slug,
  typeof flags.palette === "string" ? flags.palette : undefined,
);
console.log(
  `${r.palette} palette → ${relative(process.cwd(), r.dir)}/: ${r.files.join(", ")}`,
);
if (r.palette === "soft")
  console.log(
    "Mix under the voice: chime 0.25–0.3, tap and click 0.3–0.35, swish 0.35.",
  );
