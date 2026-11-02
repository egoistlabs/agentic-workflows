// Hacker News via the Algolia search API. No credentials.
import { getJson, probeFrom, cleanHtml, sleep } from "../core/http.js";
import type { FetchedItem, Fetcher } from "../core/types.js";

interface Hit {
  objectID: string;
  created_at: string;
  points?: number | null;
  title?: string | null;
  story_title?: string | null;
  comment_text?: string | null;
  story_text?: string | null;
}

const search = (query: string, since: Date, hits = 20) =>
  getJson<{ hits: Hit[] }>(
    `https://hn.algolia.com/api/v1/search?${new URLSearchParams({
      query,
      tags: "(story,comment)",
      hitsPerPage: String(hits),
      numericFilters: `created_at_i>${Math.floor(since.getTime() / 1000)}`,
    })}`,
  );

const toItem = (h: Hit, phrase: string): FetchedItem => ({
  id: h.objectID,
  url: `https://news.ycombinator.com/item?id=${h.objectID}`,
  date: h.created_at.slice(0, 10),
  score: h.points ?? "",
  title: h.title ?? (h.story_title ? `(on: ${h.story_title})` : ""),
  body: cleanHtml(h.comment_text ?? h.story_text ?? ""),
  phrase,
});

export const hn: Fetcher = {
  async probe({ target, since }) {
    const res = await search(target || "frustrated", since, 10);
    return probeFrom(
      res,
      (res.data?.hits ?? [])
        .map((h) => h.title ?? h.story_title ?? "")
        .filter(Boolean),
    );
  },
  async fetch({ target, phrases, since, save }) {
    for (const phrase of phrases) {
      const res = await search(
        [target, `"${phrase}"`].filter(Boolean).join(" "),
        since,
      );
      for (const h of res.data?.hits ?? [])
        if (!save(toItem(h, phrase))) return;
      await sleep(300);
    }
  },
};
