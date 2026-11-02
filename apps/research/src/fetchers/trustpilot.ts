// Trustpilot reviews, read from the page's embedded __NEXT_DATA__ JSON.
// Every review is kept (praise too), so stage 02 sees the full sentiment mix.
import { UA, TIMEOUT_MS, sleep, matchPhrase } from "../core/http.js";
import type { Fetcher } from "../core/types.js";

interface Review {
  id: string;
  rating: number;
  title: string;
  text?: string;
  dates?: { publishedDate?: string; experiencedDate?: string };
}

async function page(
  domain: string,
  n: number,
): Promise<{ status: number; reviews?: Review[]; error?: string }> {
  let res: Response;
  try {
    res = await fetch(`https://www.trustpilot.com/review/${domain}?page=${n}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    return { status: 0, error: (e as Error).message };
  }
  if (!res.ok) return { status: res.status };
  const json = (await res.text()).match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  )?.[1];
  try {
    return {
      status: res.status,
      reviews: JSON.parse(json ?? "").props.pageProps.reviews ?? [],
    };
  } catch {
    return {
      status: res.status,
      error: "page layout changed: no __NEXT_DATA__ reviews",
    };
  }
}

export const trustpilot: Fetcher = {
  async probe({ target }) {
    const res = await page(target, 1);
    if (res.status === 403) return { status: "blocked", detail: "HTTP 403" };
    if (!res.reviews)
      return { status: "blocked", detail: res.error ?? `HTTP ${res.status}` };
    if (!res.reviews.length) return { status: "blocked", detail: "no reviews" };
    return {
      status: "ok",
      detail: `${res.reviews.length} reviews on page 1`,
      samples: res.reviews.map((r) => `${r.rating}★ ${r.title}`),
    };
  },
  async fetch({ target, phrases, since, save }) {
    for (let n = 1; n <= 30; n++) {
      const { reviews } = await page(target, n);
      if (!reviews?.length) return;
      for (const r of reviews) {
        const date = r.dates?.publishedDate ?? r.dates?.experiencedDate ?? "";
        if (date && new Date(date) < since) return;
        const body = r.text ?? "";
        const ok = save({
          id: r.id,
          url: `https://www.trustpilot.com/reviews/${r.id}`,
          date: date.slice(0, 10),
          score: `${r.rating}/5`,
          title: r.title,
          body,
          phrase: matchPhrase(body, phrases),
        });
        if (!ok) return;
      }
      await sleep(1500);
    }
  },
};
