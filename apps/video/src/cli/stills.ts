import { join, relative } from "node:path";
import { contactSheet, stills } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug, ...times] = pos;
if (!slug || !times.length)
  throw new Error("usage: stills <slug> <seconds…> [--safe-zone] [--sheet]");
const files = await stills(slug, times.map(Number), {
  safeZone: !!flags["safe-zone"],
});
console.log(files.join("\n"));
if (flags.sheet) {
  // One image to show the human with the storyboard, stills in time order.
  const sheet = join(files[0]!, "..", "sheet.png");
  contactSheet(files, sheet);
  console.log(
    `Contact sheet (${times.join("s, ")}s, left to right): ${relative(process.cwd(), sheet)}`,
  );
}
