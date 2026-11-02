// Reddit via the OAuth API (client credentials). The public JSON returns 403.
import {
  UA,
  TIMEOUT_MS,
  needsCreds,
  probeFrom,
  sleep,
  type HttpResult,
} from "../core/http.js";
import type { Fetcher } from "../core/types.js";

const CREDS = ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"];

interface Post {
  id: string;
  permalink: string;
  created_utc: number;
  score: number;
  title: string;
  selftext: string;
}
interface Listing {
  data: { children: { data: Post }[] };
}

let token: string | undefined;
async function auth(): Promise<string> {
  if (token) return token;
  const { REDDIT_CLIENT_ID: id, REDDIT_CLIENT_SECRET: secret } = process.env;
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "User-Agent": UA,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
  };
  if (!json.access_token)
    throw new Error(`Reddit token request failed: HTTP ${res.status}`);
  return (token = json.access_token);
}

const sub = (target: string) => target.replace(/^\/?r\//, "");

async function get(path: string): Promise<HttpResult<Listing>> {
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    headers: { Authorization: `Bearer ${await auth()}`, "User-Agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return {
    status: res.status,
    data: res.ok ? ((await res.json()) as Listing) : undefined,
  };
}

export const reddit: Fetcher = {
  async probe({ target }) {
    const missing = needsCreds(CREDS);
    if (missing) return missing;
    try {
      const res = await get(`/r/${sub(target)}/top?t=month&limit=25`);
      return probeFrom(
        res,
        (res.data?.data.children ?? []).map((c) => c.data.title),
      );
    } catch (e) {
      return { status: "blocked", detail: (e as Error).message };
    }
  },
  async fetch({ target, phrases, since, save }) {
    if (needsCreds(CREDS)) throw new Error("needs Reddit credentials");
    for (const phrase of phrases) {
      const q = new URLSearchParams({
        q: `"${phrase}"`,
        restrict_sr: "1",
        sort: "relevance",
        t: "year",
        limit: "25",
      });
      const res = await get(`/r/${sub(target)}/search?${q}`);
      if (!res.data) {
        console.warn(`  r/${sub(target)} "${phrase}": HTTP ${res.status}`);
        continue;
      }
      for (const { data: p } of res.data.data.children) {
        if (!p.selftext || p.created_utc * 1000 < since.getTime()) continue;
        const ok = save({
          id: p.id,
          url: `https://www.reddit.com${p.permalink}`,
          date: new Date(p.created_utc * 1000).toISOString().slice(0, 10),
          score: p.score,
          title: p.title,
          body: p.selftext,
          phrase,
        });
        if (!ok) return;
      }
      await sleep(1000);
    }
  },
};
