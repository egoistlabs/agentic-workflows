// Counts from 02-code/coded.csv, so numbers in clusters.md never come from memory.
import { join } from "node:path";
import { parseCsv, read, tally } from "./files.js";

export interface GroupCount {
  label: string;
  count: number;
  avgIntensity: number;
  paysShare: number;
  firsthandShare: number;
  mainSpeaker: string;
  /** count × average intensity × (1 + share that pays) */
  score: number;
}

export interface Counts {
  total: number;
  firsthandShare: number;
  by: Record<
    "source" | "voice" | "speaker" | "sentiment",
    Record<string, number>
  >;
  firsthandBySpeaker: Record<string, number>;
  groups: GroupCount[];
}

/** Firsthand items per speaker below this are flagged as too few to conclude. */
export const MIN_TO_CONCLUDE = 20;

export function count(dir: string, groupBy = "pain"): Counts {
  const rows = parseCsv(read(join(dir, "02-code", "coded.csv")));
  if (!rows.length) throw new Error("02-code/coded.csv has no rows");
  const col = (name: string) => rows.map((r) => r[name]);
  const firsthand = rows.filter((r) => r.voice === "firsthand");

  const groups: Record<string, Record<string, string>[]> = {};
  for (const r of rows.filter((r) => r.sentiment === "pain" || !r.sentiment))
    (groups[r[groupBy] || "other"] ??= []).push(r);

  return {
    total: rows.length,
    firsthandShare: firsthand.length / rows.length,
    by: {
      source: tally(col("source")),
      voice: tally(col("voice")),
      speaker: tally(col("speaker")),
      sentiment: tally(col("sentiment")),
    },
    firsthandBySpeaker: tally(firsthand.map((r) => r.speaker)),
    groups: Object.entries(groups)
      .map(([label, g]) => {
        const avgIntensity =
          g.reduce((s, r) => s + (Number(r.intensity) || 0), 0) / g.length;
        const paysShare = g.filter((r) => r.pays === "yes").length / g.length;
        const speakers = Object.entries(tally(g.map((r) => r.speaker))).sort(
          (a, b) => b[1] - a[1],
        );
        return {
          label,
          count: g.length,
          avgIntensity,
          paysShare,
          firsthandShare:
            g.filter((r) => r.voice === "firsthand").length / g.length,
          mainSpeaker: speakers[0]?.[0] ?? "unknown",
          score: g.length * avgIntensity * (1 + paysShare),
        };
      })
      .sort((a, b) => b.score - a.score),
  };
}

const pct = (share: number) => `${Math.round(100 * share)}%`;

/** The Sample section and cluster table, as markdown for clusters.md. */
export function countsMarkdown(c: Counts, groupBy = "pain"): string {
  const out = [
    "## Sample",
    "",
    `${c.total} coded items. Firsthand share: ${pct(c.firsthandShare)}.`,
    "",
  ];
  for (const [name, t] of Object.entries(c.by)) {
    out.push(
      `| ${name} | items | share |`,
      "| --- | --- | --- |",
      ...Object.entries(t)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `| ${k} | ${v} | ${pct(v / c.total)} |`),
      "",
    );
  }
  out.push(
    `Firsthand items per speaker (fewer than ${MIN_TO_CONCLUDE} is too few to conclude):`,
    "",
  );
  for (const [speaker, n] of Object.entries(c.firsthandBySpeaker)) {
    out.push(
      `- ${speaker}: ${n}${n < MIN_TO_CONCLUDE ? " (too few to conclude)" : ""}`,
    );
  }
  out.push(
    "",
    `## Pain counts by ${groupBy}`,
    "",
    `| ${groupBy} | count | avg intensity | pays | firsthand | main speaker | score |`,
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...c.groups.map(
      (g) =>
        `| ${g.label} | ${g.count} | ${g.avgIntensity.toFixed(1)} | ${pct(g.paysShare)} | ${pct(g.firsthandShare)} | ${g.mainSpeaker} | ${g.score.toFixed(1)} |`,
    ),
  );
  return out.join("\n");
}
