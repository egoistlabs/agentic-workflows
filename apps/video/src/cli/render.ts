import { render } from "../core/index.js";

const slug = process.argv[2];
if (!slug) throw new Error("usage: render <slug>");
let last = -1;
const out = await render(slug, (p) => {
  const pct = Math.floor(p * 10) * 10;
  if (pct !== last) (console.log(`${pct}%`), (last = pct));
});
console.log(`Rendered ${out}`);
