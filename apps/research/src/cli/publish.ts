// publish [study] [--to <repo>] [--into <folder>]
// Copies the study's readable results into <repo>/<folder>/<study>/
// (defaults: the current directory, docs/research). Without a study name,
// publishes the only finished study, or lists the finished ones.
import { parseArgs } from "node:util";
import { publish, publishableStudies } from "../core/index.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { to: { type: "string" }, into: { type: "string" } },
});
let [name] = positionals;
if (!name) {
  const ready = publishableStudies();
  if (ready.length === 0)
    throw new Error(
      "no finished study to publish (none has 04-decide/decision.md)",
    );
  if (ready.length > 1) {
    console.log(
      `Finished studies: ${ready.join(", ")}\nRun: agentic-research publish <study>`,
    );
    process.exit(0);
  }
  name = ready[0]!;
}
const r = publish(name, values.to ?? process.cwd(), values.into);
console.log(`published ${name} to ${r.dest}/: ${r.files.join(", ")}`);
