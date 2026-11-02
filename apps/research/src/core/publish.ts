// Copies a finished study's human-readable results into another repo.
// Raw items, coded.csv, stage instructions and sealed.md stay behind.
import { existsSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { count } from "./count.js";
import {
  ensureDir,
  read,
  section,
  studiesDir,
  studyDir,
  writeItem,
} from "./files.js";

/** Published files in reading order, with what each one answers. */
export const PUBLISHED = [
  {
    from: "04-decide/decision.md",
    about:
      "Who we build for, the trigger moment, the pain in their words, and what would prove us wrong",
  },
  {
    from: "04-decide/REVIEW.md",
    about: "What the market says, kept apart from what it means for us",
  },
  {
    from: "03-cluster/clusters.md",
    about:
      "Ranked pains with verbatim quotes and links, the sample, and what the data cannot tell us",
  },
  {
    from: "03-cluster/disconfirming.md",
    about: "The strongest evidence against the top pains",
  },
] as const;

export interface PublishReport {
  dest: string;
  files: string[];
}

/** Writes `<repo>/<into>/<study>/`: an index README plus the published files. */
export function publish(
  name: string,
  repo: string,
  into = "docs/research",
): PublishReport {
  const dir = studyDir(name);
  if (!existsSync(join(dir, "04-decide", "decision.md"))) {
    throw new Error(
      "no 04-decide/decision.md yet; publish after the human picks a target",
    );
  }
  const dest = join(repo, into, name);
  ensureDir(dest);

  const files: string[] = [];
  const rows: string[] = [];
  for (const { from, about } of PUBLISHED) {
    if (!existsSync(join(dir, from))) continue;
    const file = basename(from);
    // Links between stage folders (../03-cluster/clusters.md) become siblings.
    const text = read(join(dir, from)).replace(
      /(?:\.\.\/)?0\d\w?-[a-z]+\/(decision|REVIEW|clusters|disconfirming)\.md/g,
      "$1.md",
    );
    writeItem(dest, file, text);
    files.push(file);
    rows.push(`| [${file}](${file}) | ${about} |`);
  }

  const question = section(
    read(join(dir, "00-brief", "brief.md")),
    "Question",
  ).join(" ");
  let evidence = "";
  try {
    const c = count(dir);
    evidence = `${c.total} coded posts and reviews, ${Math.round(100 * c.firsthandShare)}% from the audience itself (firsthand).`;
  } catch {
    // No coded.csv: leave the evidence line out rather than guess.
  }
  const index = [
    `# Research: ${name}`,
    "",
    question && `**Question:** ${question}`,
    "",
    `Published ${new Date().toISOString().slice(0, 10)}. ${evidence}`,
    "",
    "Start with the decision. Every claim in the cluster findings links to the posts it quotes.",
    "",
    "| File | Answers |",
    "| --- | --- |",
    ...rows,
    "",
  ].join("\n");
  writeItem(dest, "README.md", index);
  return {
    dest: relative(process.cwd(), dest).startsWith("..")
      ? dest
      : relative(process.cwd(), dest) || ".",
    files: ["README.md", ...files],
  };
}

/** Studies with a decision.md, i.e. ready to publish. */
export function publishableStudies(): string[] {
  if (!existsSync(studiesDir)) return [];
  return readdirSync(studiesDir)
    .filter((name) =>
      existsSync(join(studiesDir, name, "04-decide", "decision.md")),
    )
    .sort();
}
