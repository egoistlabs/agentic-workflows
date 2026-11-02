// Prints the current stage, its instructions and any open checkpoint.
// A fresh agent can resume from STATUS.md plus this output alone.
import { join } from "node:path";
import { videoLearnings, videoState, root } from "../core/index.js";

const slug = process.argv[2];
if (!slug) throw new Error("usage: route <slug>");
const s = videoState(slug);
if (s.stage === "done") {
  console.log(
    `Video done: .videos/${slug}/07-render/${slug}.mp4. Offer to publish it.`,
  );
  process.exit(0);
}
console.log(
  `Video: ${slug} (${s.format.name})\nStage: ${s.stage}\nWork in: .videos/${slug}/${s.stage}/`,
);
console.log(
  `Rules: ${join(root, "MOTION_PHILOSOPHY.md")}, groups: ${s.format.rules.join(", ")} only; check "Rejected looks"\nEngine: ${join(root, "engine", "index.jsx")} (import from "@engine")\n`,
);
console.log(`Then: ${s.next ? `stage: ${s.next}` : "stage: done"}\n`);
const learnings = videoLearnings(s.dir);
if (learnings)
  console.log(
    `Project learnings (follow these unless the human says otherwise):\n${learnings}\n`,
  );
if (s.recentLog.length) console.log(`Recent log:\n${s.recentLog.join("\n")}\n`);
if (s.checkpoint?.exists) {
  console.log(
    `CHECKPOINT: ${s.stage}/${s.checkpoint.file} waits for human approval. Show it to the human and stop.\n` +
      `When they approve, add "approved: yes" to it, log their words in STATUS.md, and move to the next stage.\n`,
  );
}
console.log(s.instructions);
