import { finishedVideos, publish } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
let [slug] = pos;
if (!slug) {
  const done = finishedVideos();
  if (done.length !== 1) {
    console.log(
      done.length
        ? `Pick one: ${done.join(", ")}`
        : "No finished videos (stage: done).",
    );
    process.exit(done.length ? 1 : 0);
  }
  slug = done[0]!;
}
const { dest, files } = publish(
  slug,
  typeof flags.to === "string" ? flags.to : undefined,
);
console.log(`Published to ${dest}: ${files.join(", ")}`);
