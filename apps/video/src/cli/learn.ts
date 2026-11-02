// learn: appends one lesson to the project's learnings file, read by every later video.
// learn --promote: moves one chosen lesson into a MOTION_PHILOSOPHY.md rule group.
// Only on the maintainer's command; nothing is ever promoted automatically.
import { appendLearning, videoDir, promoteLesson } from "../core/index.js";
import { parse } from "./args.js";

const { pos, flags } = parse();
const [slug, ...words] = pos;
const usage =
  'usage: learn <slug> "<what to do or avoid next time>"\n' +
  '       learn <slug> --promote "<lesson>"|<line number in learnings.md> [--group core|motion|talking-head|explainer]';
if (!slug) throw new Error(usage);
if (flags.promote !== undefined) {
  const lesson =
    typeof flags.promote === "string" ? flags.promote : words.join(" ");
  if (!lesson) throw new Error(usage);
  const r = promoteLesson(
    videoDir(slug),
    lesson,
    typeof flags.group === "string" ? flags.group : undefined,
  );
  console.log(`Promoted to the ${r.group} group of ${r.file}:\n${r.line}`);
} else {
  if (!words.length) throw new Error(usage);
  console.log(`Added to ${appendLearning(videoDir(slug), words.join(" "))}`);
}
