// Product Hunt comments on one post via the GraphQL API. Comments are kept when
// they contain a phrase; the API has no comment search.
import {
  UA,
  TIMEOUT_MS,
  needsCreds,
  probeFrom,
  matchPhrase,
} from "../core/http.js";
import type { Fetcher } from "../core/types.js";

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  votesCount: number;
  url: string;
}
interface Post {
  name: string;
  comments: {
    pageInfo: { hasNextPage: boolean; endCursor: string };
    edges: { node: Comment }[];
  };
}

const QUERY = `query($slug:String!,$after:String){post(slug:$slug){name comments(first:50,after:$after){
  pageInfo{hasNextPage endCursor} edges{node{id body createdAt votesCount url}}}}}`;

async function comments(
  slug: string,
  after?: string,
): Promise<{ status: number; post?: Post }> {
  const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PRODUCTHUNT_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": UA,
    },
    body: JSON.stringify({ query: QUERY, variables: { slug, after } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = res.ok
    ? ((await res.json().catch(() => undefined)) as
        { data?: { post?: Post } } | undefined)
    : undefined;
  return { status: res.status, post: json?.data?.post };
}

export const producthunt: Fetcher = {
  async probe({ target }) {
    const missing = needsCreds(["PRODUCTHUNT_TOKEN"]);
    if (missing) return missing;
    const { status, post } = await comments(target);
    return probeFrom(
      { status },
      (post?.comments.edges ?? []).map((e) => e.node.body.slice(0, 80)),
      "post not found or no comments",
    );
  },
  async fetch({ target, phrases, since, save }) {
    if (needsCreds(["PRODUCTHUNT_TOKEN"]))
      throw new Error("needs PRODUCTHUNT_TOKEN");
    let after: string | undefined;
    for (let page = 0; page < 20; page++) {
      const { post } = await comments(target, after);
      if (!post) return;
      for (const { node: c } of post.comments.edges) {
        if (new Date(c.createdAt) < since) continue;
        const phrase = matchPhrase(c.body, phrases);
        if (!phrase) continue;
        const ok = save({
          id: c.id,
          url: c.url,
          date: c.createdAt.slice(0, 10),
          score: c.votesCount,
          title: `(on: ${post.name})`,
          body: c.body,
          phrase,
        });
        if (!ok) return;
      }
      if (!post.comments.pageInfo.hasNextPage) return;
      after = post.comments.pageInfo.endCursor;
    }
  },
};
