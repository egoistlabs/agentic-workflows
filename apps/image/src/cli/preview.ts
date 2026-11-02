// preview <slug> [--port n]: serves the deck at a local URL until Ctrl-C.
// The page re-reads deck.json, layouts and tokens on every load and reloads itself on a change.
import { jobContext } from "../renderer/render.js";
import { loadJob, startServer } from "../renderer/server.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug] = pos;
if (!slug) throw new Error("usage: preview <slug> [--port <n>]");
const job = jobContext(slug);
try {
  loadJob(job);
} catch (e) {
  console.error(
    `warning: ${(e as Error).message}\n(the preview shows this until it is fixed)\n`,
  );
}
const first = typeof flags.port === "string" ? Number(flags.port) : 4180;
let served;
for (let port = first; !served && port < first + 20; port++) {
  try {
    served = await startServer(job, { port, preview: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EADDRINUSE") throw e;
  }
}
if (!served) throw new Error(`no free port from ${first} to ${first + 19}`);
const server = served;
console.log(
  `Preview of ${slug}: ${server.url}\n` +
    `One slide at full size: ${server.url}/?slide=1&zoom=1\n` +
    `Edits to 02-layout/deck.json, layouts and tokens show on reload. Ctrl-C to stop.`,
);
const stop = () => {
  void server.close().then(() => process.exit(0));
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
