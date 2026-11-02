// HTTP helpers shared by fetchers.
import type { ProbeResult } from "./types.js";

export const UA = "agentic-research/0.2";
export const TIMEOUT_MS = 20_000;
export const sleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

export interface HttpResult<T> {
  status: number;
  data?: T;
  error?: string;
}

/** GET with 429 backoff and a timeout. Never throws on HTTP errors. */
export async function getJson<T>(
  url: string,
  headers: Record<string, string> = {},
): Promise<HttpResult<T>> {
  for (let attempt = 0; attempt < 4; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": UA, ...headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      return { status: 0, error: (e as Error).message };
    }
    if (res.status === 429) {
      await sleep(4000 * (attempt + 1));
      continue;
    }
    if (!res.ok) return { status: res.status };
    try {
      return { status: res.status, data: (await res.json()) as T };
    } catch {
      return { status: res.status, error: "not JSON" };
    }
  }
  return { status: 429 };
}

/** Probe result from an HTTP result and the sample titles it returned. */
export function probeFrom(
  { status, error }: HttpResult<unknown>,
  samples: string[] = [],
  emptyNote = "returned 0 items",
): ProbeResult {
  if (status === 401 || status === 403)
    return { status: "blocked", detail: `HTTP ${status}` };
  if (!status || status >= 400)
    return { status: "blocked", detail: error ?? `HTTP ${status}` };
  if (!samples.length) return { status: "blocked", detail: emptyNote };
  return {
    status: "ok",
    detail: `${samples.length} items in one request`,
    samples,
  };
}

/** A needs-credentials result if any env var is unset, else null. */
export function needsCreds(vars: string[]): ProbeResult | null {
  const missing = vars.filter((v) => !process.env[v]);
  return missing.length
    ? { status: "needs-credentials", detail: `set ${missing.join(", ")}` }
    : null;
}

export const cleanHtml = (html = ""): string =>
  html
    .replace(/<p>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .trim();

/** First phrase contained in text (case-insensitive), or ''. */
export const matchPhrase = (text: string, phrases: string[]): string =>
  phrases.find((p) => text.toLowerCase().includes(p.toLowerCase())) ?? "";
