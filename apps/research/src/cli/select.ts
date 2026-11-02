import { select, studyDir } from "../core/index.js";

const name = process.argv[2];
if (!name) throw new Error("usage: select <study>");
const r = select(studyDir(name));
console.log(
  `select: ${r.selected}/${r.raw} items (budget ${r.budget}). By source: ${r.bySource}. By voice: ${r.byVoice}. Secondhand ${r.secondhand}/${r.secondhandCap} cap.`,
);
