// Fetchers by the `fetcher` name used in sources/registry.json.
import type { Fetcher } from "../core/types.js";
import { hn } from "./hn.js";
import { manual } from "./manual.js";
import { producthunt } from "./producthunt.js";
import { pullpush } from "./pullpush.js";
import { reddit } from "./reddit.js";
import { trustpilot } from "./trustpilot.js";
import { x } from "./x.js";
import { youtube } from "./youtube.js";

export const fetchers: Record<string, Fetcher> = {
  hn,
  manual,
  producthunt,
  pullpush,
  reddit,
  trustpilot,
  x,
  youtube,
};
export { manual };
