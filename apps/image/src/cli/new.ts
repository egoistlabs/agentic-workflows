import { newJob, SIZES, sizeLabel, statusField } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug] = pos;
const str = (v: string | true | undefined) =>
  typeof v === "string" ? v : undefined;
if (!slug)
  throw new Error(
    `usage: new <slug> [--format carousel|image] [--size ${Object.keys(SIZES).join("|")}] [--brand <dir>]`,
  );
const dir = newJob(slug, {
  format: str(flags.format),
  size: str(flags.size),
  brand: str(flags.brand),
});
const size = statusField(dir, "size") as keyof typeof SIZES;
console.log(
  `Created ${dir} (${statusField(dir, "format")}, ${sizeLabel(size)})\nBrand: ${statusField(dir, "brand")}\nNext: agentic-image route ${slug}`,
);
