// Budget guard, no model calls. Scores raw items by audience match and pain
// phrases, enforces per-row quotas and the secondhand cap, trims each item,
// and writes at most "max items" files to 01-collect/selected/.
import { join } from "node:path";
import { rmSync } from "node:fs";
import {
  ensureDir,
  fmtTally,
  formatItem,
  loadBrief,
  loadSources,
  logStatus,
  readItems,
  tally,
  writeItem,
} from "./files.js";
import type { Item } from "./types.js";

export interface SelectReport {
  selected: number;
  raw: number;
  budget: number;
  secondhand: number;
  secondhandCap: number;
  bySource: string;
  byVoice: string;
}

interface Scored extends Item {
  score: number;
  secondhand: boolean;
}

const countHits = (text: string, words: string[]) =>
  words.filter((w) => text.includes(w.toLowerCase())).length;

export function select(dir: string): SelectReport {
  const brief = loadBrief(dir);
  const plan = loadSources(dir);
  const raw = readItems(join(dir, "01-collect", "raw"));
  if (!raw.length)
    throw new Error("01-collect/raw/ is empty; run collect first");

  const items: Scored[] = raw.map((item) => {
    const text = item.body.toLowerCase();
    const firstPerson = (text.match(/\b(i|my|i'm|i've|me|we|our)\b/g) ?? [])
      .length;
    return {
      ...item,
      score:
        2 * Math.min(countHits(text, brief.audienceWords), 3) +
        Math.min(countHits(text, plan.phrases), 3) +
        (firstPerson >= 3 ? 1 : 0) -
        (item.body.length < 150 ? 1 : 0),
      secondhand: item.meta.voice !== "firsthand",
    };
  });

  // Each row gets budget in proportion to its quota.
  const totalQuota = plan.rows.reduce((s, r) => s + r.quota, 0) || 1;
  const alloc = new Map(
    plan.rows.map((r) => [
      r.key,
      Math.floor((r.quota / totalQuota) * brief.maxItems),
    ]),
  );
  const capSecond = Math.floor(plan.secondhandCap * brief.maxItems);
  const byScore = (a: Scored, b: Scored) =>
    b.score - a.score || a.file.localeCompare(b.file);

  const picked = new Set<Scored>();
  let second = 0;
  const take = (item: Scored): boolean => {
    if (picked.size >= brief.maxItems || picked.has(item)) return false;
    if (item.secondhand && second >= capSecond) return false;
    picked.add(item);
    if (item.secondhand) second++;
    return true;
  };
  // Pass 1: each row up to its allocation, firsthand rows first.
  const firsthandFirst = [...plan.rows].sort(
    (a, b) => Number(a.voice !== "firsthand") - Number(b.voice !== "firsthand"),
  );
  for (const row of firsthandFirst) {
    let n = 0;
    for (const item of items
      .filter((i) => i.meta.row === row.key)
      .sort(byScore)) {
      if (n >= (alloc.get(row.key) ?? 0)) break;
      if (take(item)) n++;
    }
  }
  // Pass 2: fill unused budget with the best leftovers, firsthand before secondhand.
  for (const item of [...items].sort(
    (a, b) => Number(a.secondhand) - Number(b.secondhand) || byScore(a, b),
  ))
    take(item);

  const trim = (body: string): string => {
    if (body.length <= brief.maxChars) return body;
    const lower = body.toLowerCase();
    const hits = plan.phrases
      .map((p) => lower.indexOf(p.toLowerCase()))
      .filter((i) => i >= 0);
    const start = hits.length
      ? Math.max(0, Math.min(...hits) - Math.floor(brief.maxChars / 3))
      : 0;
    return `${start > 0 ? "…" : ""}${body.slice(start, start + brief.maxChars)}…`;
  };

  const out = join(dir, "01-collect", "selected");
  rmSync(out, { recursive: true, force: true });
  ensureDir(out);
  const chosen = [...picked].sort((a, b) => a.file.localeCompare(b.file));
  for (const item of chosen)
    writeItem(
      out,
      item.file,
      formatItem(
        { ...item.meta, select_score: item.score },
        "",
        trim(item.body),
      ),
    );

  const report: SelectReport = {
    selected: chosen.length,
    raw: items.length,
    budget: brief.maxItems,
    secondhand: second,
    secondhandCap: capSecond,
    bySource: fmtTally(tally(chosen.map((i) => i.meta.source))),
    byVoice: fmtTally(tally(chosen.map((i) => i.meta.voice))),
  };
  logStatus(
    dir,
    `select: ${report.selected}/${report.raw} items (budget ${brief.maxItems}, ${brief.maxChars} chars). By source: ${report.bySource}. By voice: ${report.byVoice}. Secondhand ${second}/${capSecond} cap.`,
  );
  return report;
}
