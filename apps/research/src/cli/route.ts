// Prints the current stage, its instructions, and any checkpoint or blind-stage
// reminder. A fresh agent can resume from STATUS.md plus this output alone.
import { studyState } from "../core/index.js";

const name = process.argv[2];
if (!name) throw new Error("usage: route <study>");
const s = studyState(name);
if (s.stage === "done") {
  console.log(`Study done. Read .studies/${name}/04-decide/decision.md`);
  process.exit(0);
}

console.log(
  `Study: ${name}\nStage: ${s.stage}\nWork in: .studies/${name}/${s.stage}/\n`,
);
if (s.recentLog.length) console.log(`Recent log:\n${s.recentLog.join("\n")}\n`);
if (s.blind) {
  console.log(
    "BLIND STAGE: do not open 00-brief/sealed.md, and do not use what you know about our product, company or hypotheses. Report only what the data says.\n",
  );
}

switch (s.checkpoint?.kind) {
  case "probe-sources":
    console.log(
      `Not probed yet: ${s.checkpoint.unprobed.join(", ")}. Run collect --probe and fill the access column.\n`,
    );
    break;
  case "approve-sources":
    console.log(
      "CHECKPOINT 1: sources.md is drafted and waits for human approval. Show the human this table and stop.",
    );
    console.log(
      'When they approve, set "approved: yes" in sources.md and "stage: 01-collect" in STATUS.md.\n',
    );
    console.log(s.checkpoint.table);
    process.exit(0);
  case "sources-approved":
    console.log(
      'sources.md is approved. Set "stage: 01-collect" in STATUS.md and run the router again.\n',
    );
    process.exit(0);
  case "pick-target":
    console.log(
      "CHECKPOINT 2: REVIEW.md is written and waits for the human to pick a target. If they have not picked, show them REVIEW.md and stop.",
    );
    console.log(
      "Once they pick, log the pick in STATUS.md and write decision.md as the instructions say.\n",
    );
    break;
}
console.log(s.instructions);
