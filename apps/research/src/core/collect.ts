// Probing sources and collecting raw items up to each row's quota.
import { join } from "node:path";
import { existsSync } from "node:fs";
import { fetchers, manual } from "../fetchers/index.js";
import {
  ensureDir,
  fmtTally,
  formatItem,
  loadBrief,
  loadRegistry,
  loadSources,
  logStatus,
  readItems,
  rowKey,
  tally,
  writeItem,
} from "./files.js";
import type {
  FetchedItem,
  Fetcher,
  ProbeArgs,
  ProbeResult,
  SourceRow,
} from "./types.js";

export interface ProbeRow {
  source: string;
  target: string;
  key: string;
  result: ProbeResult;
}
export interface CollectRow {
  key: string;
  quota: number;
  total: number;
  saved: number;
  note: string;
}
export interface CollectReport {
  rows: CollectRow[];
  total: number;
  bySource: string;
  byVoice: string;
  problems: string[];
}

function fetcherFor(source: string): Fetcher {
  const entry = loadRegistry().find((s) => s.id === source);
  if (!entry) throw new Error(`"${source}" is not in sources/registry.json`);
  const fetcher = fetchers[entry.fetcher];
  if (!fetcher)
    throw new Error(
      `registry entry "${source}" names unknown fetcher "${entry.fetcher}"`,
    );
  return fetcher;
}

/**
 * Probes a row. If its API is not usable but items were saved by hand in
 * manual/<source>/, falls back to importing those.
 */
async function access(
  args: ProbeArgs,
): Promise<{ fetcher: Fetcher; result: ProbeResult }> {
  let fetcher = fetcherFor(args.source);
  let result: ProbeResult;
  try {
    result = await fetcher.probe(args);
  } catch (e) {
    result = { status: "blocked", detail: (e as Error).message };
  }
  if (result.status !== "ok" && fetcher !== manual) {
    const local = await manual.probe(args);
    if (local.status === "ok") {
      fetcher = manual;
      result = {
        ...local,
        detail: `${result.status} (${result.detail}); using ${local.detail}`,
      };
    }
  }
  return { fetcher, result };
}

/**
 * One request per row (sources.md rows, or `source:target` specs). Writes
 * 00b-sources/probe.md with results and sample titles for the open phrase pass.
 */
export async function probeSources(
  dir: string,
  specs: string[] = [],
): Promise<ProbeRow[]> {
  const brief = loadBrief(dir);
  const rows = specs.length
    ? specs.map((spec) => {
        const [source = "", ...rest] = spec.split(":");
        return { source, target: rest.join(":") };
      })
    : loadSources(dir).rows;
  if (!rows.length)
    throw new Error(
      "no rows in 00b-sources/sources.md; pass source:target arguments",
    );

  const out: ProbeRow[] = [];
  for (const row of rows) {
    let result: ProbeResult;
    try {
      ({ result } = await access({
        study: dir,
        source: row.source,
        target: row.target,
        since: brief.since,
      }));
    } catch (e) {
      result = { status: "blocked", detail: (e as Error).message };
    }
    out.push({
      source: row.source,
      target: row.target,
      key: rowKey(row),
      result,
    });
  }

  const lines = [
    "# Probe results",
    "",
    `Run ${new Date().toISOString().slice(0, 10)}, one request per source.`,
    "",
    "| source | target | access | detail |",
    "| --- | --- | --- | --- |",
    ...out.map(
      (r) =>
        `| ${r.source} | ${r.target} | ${r.result.status} | ${r.result.detail} |`,
    ),
    "",
    "# Sample titles (for the open phrase pass)",
    "",
  ];
  for (const r of out.filter((r) => r.result.samples?.length)) {
    lines.push(
      `## ${r.key}`,
      "",
      ...r.result
        .samples!.slice(0, 25)
        .map((s) => `- ${s.replace(/\s+/g, " ")}`),
      "",
    );
  }
  ensureDir(join(dir, "00b-sources"));
  writeItem(join(dir, "00b-sources"), "probe.md", lines.join("\n") + "\n");
  return out;
}

/** Runs each approved row up to its quota, then logs counts to STATUS.md. */
export async function collect(
  dir: string,
  onRow?: (row: CollectRow) => void,
): Promise<CollectReport> {
  const brief = loadBrief(dir);
  const plan = loadSources(dir);
  if (!plan.approved)
    throw new Error(
      '00b-sources/sources.md is not approved (needs "approved: yes" from a human)',
    );
  const raw = join(dir, "01-collect", "raw");
  ensureDir(raw);
  const existing = readItems(raw);
  const rows: CollectRow[] = [];

  for (const row of plan.rows.filter((r) => r.quota > 0)) {
    const have = existing.filter((i) => i.meta.row === row.key).length;
    const state = { saved: 0 };
    let note = "";
    if (have >= row.quota) note = "quota already met";
    else {
      try {
        const { fetcher, result } = await access({
          study: dir,
          source: row.source,
          target: row.target,
          since: brief.since,
        });
        if (result.status !== "ok")
          note = `${result.status.toUpperCase()}: ${result.detail}`;
        else
          await fetcher.fetch({
            study: dir,
            source: row.source,
            target: row.target,
            since: brief.since,
            phrases: plan.phrases,
            quota: row.quota,
            save: saver(raw, row, have, state),
          });
      } catch (e) {
        note = `ERROR: ${(e as Error).message}`;
      }
      if (!note && have + state.saved === 0)
        note = "EMPTY: request worked but nothing matched";
    }
    const report = {
      key: row.key,
      quota: row.quota,
      total: have + state.saved,
      saved: state.saved,
      note,
    };
    rows.push(report);
    onRow?.(report);
  }

  const all = readItems(raw);
  const bySource = fmtTally(tally(all.map((i) => i.meta.source)));
  const byVoice = fmtTally(tally(all.map((i) => i.meta.voice)));
  const problems = rows
    .filter((r) => r.note && r.note !== "quota already met")
    .map((r) => `${r.key} ${r.note.split(":")[0]}`);
  logStatus(
    dir,
    `collect: ${all.length} raw items. By source: ${bySource}. By voice: ${byVoice}.${problems.length ? ` Not collected: ${problems.join("; ")}.` : ""}`,
  );
  return { rows, total: all.length, bySource, byVoice, problems };
}

/** The `save` callback for one row: writes raw/<source>-<id>.md until the quota is met. */
function saver(
  raw: string,
  row: SourceRow,
  have: number,
  state: { saved: number },
) {
  return (item: FetchedItem): boolean => {
    if (have + state.saved >= row.quota) return false;
    const body = (item.body ?? "").trim();
    if (body.length < 80) return true;
    const file = `${row.source}-${String(item.id).replace(/[^\w-]/g, "_")}.md`;
    if (existsSync(join(raw, file))) return true;
    writeItem(
      raw,
      file,
      formatItem(
        {
          source: row.source,
          row: row.key,
          url: item.url,
          date: item.date,
          score: item.score,
          phrase: item.phrase,
          voice: row.voice,
          audience_guess: row.audienceGroup,
          author_type_guess: "",
        },
        item.title,
        body.slice(0, 4000),
      ),
    );
    state.saved++;
    return have + state.saved < row.quota;
  };
}
