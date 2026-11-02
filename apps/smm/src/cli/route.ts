// Prints the current stage, its instructions, the learnings and any open
// checkpoint. A fresh agent can resume from STATUS.md plus this output alone.
import { join } from "node:path";
import { planLearnings, planState, root } from "../core/index.js";

const slug = process.argv[2];
if (!slug) throw new Error("usage: route <slug>");
const s = planState(slug);
if (s.stage === "done") {
  console.log(
    `Plan done: every stage of .plans/${slug}/ is finished. Read 10-review/review.md.`,
  );
  process.exit(0);
}
console.log(
  `Plan: ${slug} (${s.weeks} weeks × ${s.perWeek} posts per week = ${s.weeks * s.perWeek} slots)\nStage: ${s.stage}\nWork in: .plans/${slug}/${s.stage}/`,
);
console.log(
  `Brand: ${s.brand} (brand.md, story-bank.md, learnings.md)\nFormats: ${join(root, "formats")} (agentic-smm formats show <id>)\n`,
);
console.log(`Then: ${s.next ? `stage: ${s.next}` : "stage: done"}\n`);
const learnings = planLearnings(s.dir);
console.log(
  learnings
    ? `Learnings from ${s.learnings} (follow these unless the human says otherwise):\n${learnings}\n`
    : `Learnings: none yet (${s.learnings})\n`,
);
if (s.recentLog.length) console.log(`Recent log:\n${s.recentLog.join("\n")}\n`);
if (s.checkpoint?.exists)
  console.log(
    `CHECKPOINT: ${s.stage}/${s.checkpoint.file} waits for human approval. Show it to the human and stop.\n` +
      `When they approve, add "approved: yes" to it, log their words in STATUS.md, and set stage: ${s.next ?? "done"}.\n`,
  );
else if (s.checkpoint)
  console.log(
    `Checkpoint: this stage ends when the human approves ${s.stage}/${s.checkpoint.file} (an "approved: yes" line). Never add that line yourself without their approval.\n`,
  );
else if (s.approvedFile)
  console.log(
    `${s.stage}/${s.approvedFile} is approved. Finish any after-approval steps below, set stage: ${s.next ?? "done"} and run route again.\n`,
  );
console.log(s.instructions);
