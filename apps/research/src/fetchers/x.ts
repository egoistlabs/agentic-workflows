// X via the v2 recent-search API (last 7 days only). Without a token, collect
// falls back to posts saved by hand in 01-collect/manual/x/.
import { getJson, needsCreds, probeFrom, sleep } from "../core/http.js";
import type { Fetcher } from "../core/types.js";

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: { like_count: number };
}

const search = (query: string) =>
  getJson<{ data?: Tweet[] }>(
    `https://api.x.com/2/tweets/search/recent?${new URLSearchParams({
      query: `${query} -is:retweet lang:en`,
      max_results: "50",
      "tweet.fields": "created_at,public_metrics",
    })}`,
    { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
  );

export const x: Fetcher = {
  async probe({ target }) {
    const missing = needsCreds(["X_BEARER_TOKEN"]);
    if (missing)
      return {
        ...missing,
        detail: `${missing.detail}, or save posts in 01-collect/manual/x/`,
      };
    const res = await search(target || "frustrated");
    return probeFrom(
      res,
      (res.data?.data ?? []).map((t) => t.text.slice(0, 80)),
    );
  },
  async fetch({ target, phrases, save }) {
    for (const phrase of phrases) {
      const res = await search(
        [target, `"${phrase}"`].filter(Boolean).join(" "),
      );
      for (const t of res.data?.data ?? []) {
        const ok = save({
          id: t.id,
          url: `https://x.com/i/status/${t.id}`,
          date: t.created_at.slice(0, 10),
          score: t.public_metrics?.like_count ?? "",
          title: "",
          body: t.text,
          phrase,
        });
        if (!ok) return;
      }
      await sleep(1000);
    }
  },
};
