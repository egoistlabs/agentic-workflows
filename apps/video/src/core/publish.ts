// Copies a finished video's deliverables into <repo>/videos/<slug>/.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { videoDir, videosDir, statusField } from "./files.js";

const DELIVERABLES = [
  "02-story/script.md",
  "02-story/structure.md",
  "04-storyboard/storyboard.md",
  "06-qa/qa.md",
  "07-render/caption.md",
];

/** Finished videos in the current repo (stage: done). */
export function finishedVideos(cwd = process.cwd()): string[] {
  const dir = videosDir(cwd);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(
    (s) =>
      existsSync(join(dir, s, "STATUS.md")) &&
      statusField(join(dir, s), "stage") === "done",
  );
}

export function publish(
  slug: string,
  to = process.cwd(),
): { dest: string; files: string[] } {
  const dir = videoDir(slug);
  const dest = join(resolve(to), "videos", slug);
  mkdirSync(dest, { recursive: true });
  const files: string[] = [];
  const copy = (rel: string) => {
    const src = join(dir, rel);
    if (!existsSync(src)) return;
    const name = rel.split("/").pop()!;
    copyFileSync(src, join(dest, name));
    files.push(name);
  };
  copy(`07-render/${slug}.mp4`);
  DELIVERABLES.forEach(copy);
  if (!files.some((f) => f.endsWith(".mp4")))
    throw new Error(`no 07-render/${slug}.mp4; render first`);
  return { dest, files };
}
