// collect <study>                    run each approved row up to its quota
// collect <study> --probe [specs…]   one request per row (or per source:target spec)
import { collect, probeSources, studyDir } from "../core/index.js";

const [name, flag, ...specs] = process.argv.slice(2);
if (!name)
  throw new Error("usage: collect <study> [--probe [source:target ...]]");
const dir = studyDir(name);

if (flag === "--probe") {
  for (const r of await probeSources(dir, specs)) {
    console.log(
      `${r.key.padEnd(36)} ${r.result.status.padEnd(18)} ${r.result.detail}`,
    );
  }
  console.log(`\nwrote .studies/${name}/00b-sources/probe.md`);
} else {
  const report = await collect(dir, (r) =>
    console.log(
      `${r.key.padEnd(36)} ${String(r.total).padStart(4)}/${r.quota}  +${r.saved}  ${r.note}`,
    ),
  );
  console.log(
    `\nraw/: ${report.total} items. By source: ${report.bySource}. By voice: ${report.byVoice}.`,
  );
  if (report.problems.length)
    console.log(`Not collected: ${report.problems.join("; ")}`);
}
