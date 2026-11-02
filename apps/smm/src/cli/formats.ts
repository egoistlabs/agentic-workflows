// formats list | show <id>: the installed format manifests.
import { formatBrief, listFormats, loadFormat } from "../core/index.js";
import { parse } from "./args.js";

const { pos } = parse();
const [sub, id] = pos;
if (sub === "list") {
  for (const f of listFormats())
    console.log(
      `${f.id.padEnd(10)} ${f.name}: ${f.bestFor.join(", ")} (${f.producer.tool})`,
    );
} else if (sub === "show" && id) {
  const f = loadFormat(id);
  console.log(JSON.stringify(f, null, 2));
  console.log(`\nBrief template (formats/${f.id}/${f.brief}):\n`);
  console.log(formatBrief(f));
} else throw new Error("usage: formats list | show <id>");
