// Reddit archive via PullPush. No credentials; coverage is patchy.
import { getJson, probeFrom, sleep } from "../core/http.js";
import type { Fetcher } from "../core/types.js";

interface Entry {
  id: string;
  permalink: string;
  created_utc: number;
  score?: number;
  title?: string;
  selftext?: string;
  body?: string;
}

const sub = (target: string) => target.replace(/^\/?r\//, "");
const after = (since: Date) => String(Math.floor(since.getTime() / 1000));
const search = (
  kind: "submission" | "comment",
  params: Record<string, string>,
) =>
  getJson<{ data: Entry[] }>(
    `https://api.pullpush.io/reddit/search/${kind}/?${new URLSearchParams(params)}`,
  );

export const pullpush: Fetcher = {
  async probe({ target, since }) {
    const res = await search("submission", {
      subreddit: sub(target),
      size: "25",
      after: after(since),
    });
    return probeFrom(
      res,
      (res.data?.data ?? []).map((p) => p.title ?? ""),
      "returned 0 items (archive may not cover this subreddit or window)",
    );
  },
  async fetch({ target, phrases, since, save }) {
    for (const phrase of phrases) {
      for (const kind of ["submission", "comment"] as const) {
        const res = await search(kind, {
          q: `"${phrase}"`,
          subreddit: sub(target),
          size: "25",
          after: after(since),
        });
        for (const p of res.data?.data ?? []) {
          const body = kind === "submission" ? p.selftext : p.body;
          if (!body || body === "[removed]" || body === "[deleted]") continue;
          const ok = save({
            id: p.id,
            url: `https://www.reddit.com${p.permalink}`,
            date: new Date(p.created_utc * 1000).toISOString().slice(0, 10),
            score: p.score ?? "",
            title: p.title ?? "",
            body,
            phrase,
          });
          if (!ok) return;
        }
        await sleep(1500);
      }
    }
  },
};
