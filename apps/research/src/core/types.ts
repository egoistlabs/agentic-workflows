export type Stage =
  | "00-brief"
  | "00b-sources"
  | "01-collect"
  | "02-code"
  | "03-cluster"
  | "04-decide";
export type Voice = "firsthand" | "secondhand";
export type AccessStatus =
  "ok" | "blocked" | "needs-credentials" | "needs-manual";

export interface Brief {
  text: string;
  maxItems: number;
  maxChars: number;
  since: Date;
  /** Self-descriptions and tool names, lowercased; used to score audience match. */
  audienceWords: string[];
}

/** One row of 00b-sources/sources.md. */
export interface SourceRow {
  source: string;
  target: string;
  audienceGroup: string;
  voice: string;
  reach: string;
  access: string;
  quota: number;
  /** `source:target`, stored on each raw item as `row`. */
  key: string;
}

export interface SourcePlan {
  text: string;
  approved: boolean;
  secondhandCap: number;
  rows: SourceRow[];
  phrases: string[];
}

export interface RegistryEntry {
  id: string;
  name: string;
  kind: "forum" | "qa" | "reviews" | "social" | "community";
  audiences: string[];
  voice: string;
  needs: string[];
  fetcher: string;
  target: string;
}

export interface ProbeResult {
  status: AccessStatus;
  detail: string;
  samples?: string[];
}

/** What a fetcher hands to `save`; collect adds row, voice and audience. */
export interface FetchedItem {
  id: string;
  url: string;
  date: string;
  score: string | number;
  title: string;
  body: string;
  phrase: string;
}

export interface ProbeArgs {
  study: string;
  source: string;
  target: string;
  since: Date;
}

export interface FetchArgs extends ProbeArgs {
  phrases: string[];
  quota: number;
  /** Writes one item. Returns false once the row's quota is met; stop then. */
  save: (item: FetchedItem) => boolean;
}

export interface Fetcher {
  probe(args: ProbeArgs): Promise<ProbeResult>;
  fetch(args: FetchArgs): Promise<void>;
}

/** A raw or selected item file: front matter plus verbatim body. */
export interface Item {
  file: string;
  meta: Record<string, string>;
  body: string;
}
