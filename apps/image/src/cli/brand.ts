// brand check [<dir>]: which tokens a pack sets, which come from the default,
// and which font file the renderer will load. Without <dir>, the pack `new` would pick.
import {
  defaultBrand,
  fontPath,
  fontWarning,
  loadTokens,
  resolveBrand,
  tokenSources,
} from "../core/index.js";

const [sub, dir] = process.argv.slice(2);
if (sub !== "check") throw new Error("usage: brand check [<dir>]");
const pack = resolveBrand(process.cwd(), dir);
const tokens = loadTokens(pack);
const src = tokenSources(pack);
const list = (keys: string[]) =>
  keys.map((k) => `  ${k}: ${tokens[k]}`).join("\n");

console.log(
  pack === defaultBrand
    ? `Pack: ${pack} (the default; no project pack found)\n`
    : `Pack: ${pack}\n`,
);
console.log(`Set by the pack (${src.set.length}):\n${list(src.set)}\n`);
if (src.fromDefault.length)
  console.log(
    `From the default (${src.fromDefault.length}):\n${list(src.fromDefault)}\n`,
  );
if (src.unused.length)
  console.log(
    `Set but not used by agentic-image (${src.unused.length}): ${src.unused.join(", ")}\n`,
  );
console.log(`Font file: ${fontPath(pack)}`);
const mono = fontPath(pack, true);
if (mono) console.log(`Mono font file: ${mono}`);
const warning = fontWarning(pack);
if (warning) console.log(`Warning: ${warning}`);
