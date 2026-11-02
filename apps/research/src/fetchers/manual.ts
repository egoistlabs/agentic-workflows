// Imports items a human or agent saved by hand into 01-collect/manual/<source>/.
// Each file: front matter with at least `url` (and ideally `date`), then the
// verbatim text. Used for G2, Discord, Skool, websearch, and as the fallback
// for any blocked source.
import { join } from "node:path";
import { readItems } from "../core/files.js";
import { matchPhrase } from "../core/http.js";
import type { Fetcher } from "../core/types.js";

const folder = (study: string, source: string) =>
  join(study, "01-collect", "manual", source);

export const manual: Fetcher = {
  async probe({ study, source }) {
    const items = readItems(folder(study, source));
    if (!items.length)
      return {
        status: "needs-manual",
        detail: `save .md files in 01-collect/manual/${source}/`,
      };
    return {
      status: "ok",
      detail: `${items.length} files saved by hand`,
      samples: items.map((i) => i.body.slice(0, 80)),
    };
  },
  async fetch({ study, source, phrases, since, save }) {
    for (const { file, meta, body } of readItems(folder(study, source))) {
      if (!meta.url) {
        console.warn(`  skipped manual/${source}/${file}: no url`);
        continue;
      }
      if (meta.date && new Date(meta.date) < since) continue;
      const ok = save({
        id: file.replace(/\.md$/, ""),
        url: meta.url,
        date: meta.date ?? "",
        score: meta.score ?? "",
        title: "",
        body,
        phrase: meta.phrase ?? matchPhrase(body, phrases),
      });
      if (!ok) return;
    }
  },
};
