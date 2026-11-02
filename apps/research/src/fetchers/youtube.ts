// YouTube comments via the Data API: find videos for the target query, then
// search each video's comment threads for each phrase.
import { getJson, needsCreds, probeFrom } from "../core/http.js";
import type { Fetcher } from "../core/types.js";

interface Video {
  id: { videoId: string };
  snippet: { title: string };
}
interface Thread {
  id: string;
  snippet: {
    topLevelComment: {
      snippet: { publishedAt: string; likeCount: number; textDisplay: string };
    };
  };
}

const api = <T>(path: string, params: Record<string, string>) =>
  getJson<{ items: T[] }>(
    `https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ key: process.env.YOUTUBE_API_KEY ?? "", ...params })}`,
  );
const videos = (q: string, since: Date) =>
  api<Video>("search", {
    part: "snippet",
    type: "video",
    q,
    maxResults: "10",
    publishedAfter: since.toISOString(),
    order: "relevance",
  });

export const youtube: Fetcher = {
  async probe({ target, since }) {
    const missing = needsCreds(["YOUTUBE_API_KEY"]);
    if (missing) return missing;
    const res = await videos(target, since);
    return probeFrom(
      res,
      (res.data?.items ?? []).map((v) => v.snippet.title),
    );
  },
  async fetch({ target, phrases, since, save }) {
    if (needsCreds(["YOUTUBE_API_KEY"]))
      throw new Error("needs YOUTUBE_API_KEY");
    for (const v of (await videos(target, since)).data?.items ?? []) {
      for (const phrase of phrases) {
        const res = await api<Thread>("commentThreads", {
          part: "snippet",
          videoId: v.id.videoId,
          searchTerms: phrase,
          maxResults: "20",
          textFormat: "plainText",
        });
        for (const t of res.data?.items ?? []) {
          const c = t.snippet.topLevelComment.snippet;
          if (new Date(c.publishedAt) < since) continue;
          const ok = save({
            id: t.id,
            url: `https://www.youtube.com/watch?v=${v.id.videoId}&lc=${t.id}`,
            date: c.publishedAt.slice(0, 10),
            score: c.likeCount,
            title: `(on: ${v.snippet.title})`,
            body: c.textDisplay,
            phrase,
          });
          if (!ok) return;
        }
      }
    }
  },
};
