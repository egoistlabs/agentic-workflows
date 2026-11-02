// cut: renders the approved keep list (03-source/keep.json) as the video's cut.
import { relative } from "node:path";
import { cut } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug] = pos;
const str = (v: string | true | undefined) =>
  typeof v === "string" ? v : undefined;
if (!slug)
  throw new Error(
    "usage: cut <slug> [--preview] [--speed 1.0|1.1] [--clip assets/<file>] [--sequential]",
  );
const r = cut(slug, {
  preview: !!flags.preview,
  speed: str(flags.speed),
  clip: str(flags.clip),
  sequential: !!flags.sequential,
});
console.log(
  `${r.onePass ? "One pass" : "Sequential"}: ${r.segments} segments, ${r.duration.toFixed(2)}s` +
    (r.drift !== undefined
      ? `, A/V ${r.drift >= 0 ? "+" : ""}${r.drift.toFixed(3)}s`
      : ""),
);
for (const f of r.files) console.log(`  ${relative(process.cwd(), f)}`);
