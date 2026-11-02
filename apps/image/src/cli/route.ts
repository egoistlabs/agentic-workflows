// Prints the current stage, its instructions and any open checkpoint.
// A fresh agent can resume from STATUS.md plus this output alone.
import { join } from "node:path";
import { jobLearnings, jobState, root, sizeLabel } from "../core/index.js";

const slug = process.argv[2];
if (!slug) throw new Error("usage: route <slug>");
const s = jobState(slug);
const out = `.images/${slug}/04-deliver/`;
if (s.stage === "done") {
  console.log(
    `Job done: ${slug} (${s.format}, ${sizeLabel(s.size)}).\n` +
      `Deliverables: ${out} (01.png, 02.png… in posting order, caption.md, asset.json).\n` +
      `Offer to publish them with agentic-image publish ${slug} (arrives in build step 3; until then, tell the human where the files are).`,
  );
  process.exit(0);
}
console.log(
  `Job: ${slug} (${s.format}, ${sizeLabel(s.size)})\nStage: ${s.stage}\nWork in: .images/${slug}/${s.stage}/\n` +
    `Brand: ${s.brand}\n` +
    `Tool: ${root} (shared layouts in ${join(root, "layouts")}/, rules in README.md)\n` +
    `Then: ${s.next ? `stage: ${s.next}` : "stage: done"}\n`,
);
console.log(
  `Checkpoints:\n${s.checkpoints
    .map(
      (c) =>
        `  ${c.stage}/${c.file} (${c.approves}): ${c.approved ? "approved" : "open"}`,
    )
    .join("\n")}\n`,
);
const learnings = jobLearnings(s.dir);
if (learnings)
  console.log(
    `Project learnings (shared with the brand's other tools; follow the ones that apply to images unless the human says otherwise):\n${learnings}\n`,
  );
if (s.recentLog.length) console.log(`Recent log:\n${s.recentLog.join("\n")}\n`);
const c = s.checkpoint;
if (c?.exists)
  console.log(
    `CHECKPOINT: ${c.stage}/${c.file} waits for the human's ${c.approves} approval. Show it to the human and stop.\n` +
      `When they approve, add "approved: yes" to it, log their words in STATUS.md, and move to the next stage.\n`,
  );
else if (c)
  console.log(
    `CHECKPOINT ahead: this stage ends with ${c.stage}/${c.file}, which needs the human's ${c.approves} approval before stage: ${s.next ?? "done"}.\n`,
  );
console.log(s.instructions);
