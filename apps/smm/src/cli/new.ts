import { newPlan, statusField } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug] = pos;
const num = (k: string) =>
  typeof flags[k] === "string" ? Number(flags[k]) : undefined;
if (!slug)
  throw new Error(
    "usage: new <slug> [--weeks n] [--per-week n] [--brand <dir>]",
  );
const dir = newPlan(slug, {
  weeks: num("weeks"),
  perWeek: num("per-week"),
  brand: typeof flags.brand === "string" ? flags.brand : undefined,
});
console.log(
  `Created ${dir} (${statusField(dir, "weeks")} weeks × ${statusField(dir, "per-week")} per week, brand ${statusField(dir, "brand")}). Next: agentic-smm route ${slug}`,
);
