import assert from "node:assert/strict";
import {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { defaultBrand, jobState, newJob, stageMap } from "../src/core/index.ts";

const tmp = mkdtempSync(join(tmpdir(), "agentic-image-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

function setStage(dir: string, stage: string) {
  const p = join(dir, "STATUS.md");
  writeFileSync(
    p,
    readFileSync(p, "utf8").replace(/^stage:.*$/m, `stage: ${stage}`),
  );
  appendFileSync(p, `- moved to ${stage}\n`);
}

test("route walks an empty job to 04-deliver, then done", () => {
  const dir = newJob("walk", {}, tmp);
  const status = readFileSync(join(dir, "STATUS.md"), "utf8");
  assert.match(status, /^format: carousel$/m);
  assert.match(status, /^size: portrait$/m);
  assert.match(status, new RegExp(`^brand: ${defaultBrand}$`, "m"));
  assert.match(status, /^learnings: .*\.images\/learnings\.md$/m);
  assert.match(status, /^## Log$/m);

  const seen: string[] = [];
  const approvedAt: string[] = [];
  for (let n = 0; n < 10; n++) {
    const s = jobState("walk", tmp);
    seen.push(s.stage);
    if (s.stage === "done") break;
    assert.match(s.instructions, /^# \d\d /);
    if (s.checkpoint) {
      writeFileSync(join(dir, s.stage, s.checkpoint.file), "approved: yes\n");
      approvedAt.push(`${s.stage}/${s.checkpoint.file}`);
      assert.equal(jobState("walk", tmp).checkpoint, undefined);
    }
    setStage(dir, s.next ?? "done");
  }
  assert.deepEqual(seen, [...stageMap().stages, "done"]);
  assert.ok(seen.includes("04-deliver"));
  assert.deepEqual(approvedAt, ["01-copy/copy.md", "03-render/visuals.md"]);
  const done = jobState("walk", tmp);
  assert.ok(done.checkpoints.every((c) => c.approved));
  assert.deepEqual(done.recentLog.at(-1), "- moved to done");
});

test("a skipped checkpoint throws", () => {
  const dir = newJob("skip", {}, tmp);
  setStage(dir, "02-layout");
  assert.throws(
    () => jobState("skip", tmp),
    /01-copy\/copy\.md \(Copy\) is not approved/,
  );
  // A checkpoint file without the approval line doesn't count.
  writeFileSync(
    join(dir, "01-copy", "copy.md"),
    "| # | Copy | What it does |\n",
  );
  assert.throws(() => jobState("skip", tmp), /not approved/);
  writeFileSync(join(dir, "01-copy", "copy.md"), "approved: yes\n");
  assert.equal(jobState("skip", tmp).stage, "02-layout");
  // Visuals are approved separately from copy.
  setStage(dir, "04-deliver");
  assert.throws(
    () => jobState("skip", tmp),
    /03-render\/visuals\.md \(Visuals\)/,
  );
  setStage(dir, "done");
  assert.throws(() => jobState("skip", tmp), /visuals\.md/);
});

test("the current checkpoint stays open until approved", () => {
  const dir = newJob("open", {}, tmp);
  setStage(dir, "01-copy");
  assert.deepEqual(
    { ...jobState("open", tmp).checkpoint },
    {
      file: "copy.md",
      approves: "Copy",
      stage: "01-copy",
      approved: false,
      exists: false,
    },
  );
  writeFileSync(join(dir, "01-copy", "copy.md"), "v3 is the latest\n");
  assert.equal(jobState("open", tmp).checkpoint?.exists, true);
});

test("format and size are validated", () => {
  assert.throws(
    () => newJob("bad-size", { size: "landscape" }, tmp),
    /unknown size "landscape"/,
  );
  assert.throws(
    () => newJob("bad-format", { format: "reel" }, tmp),
    /unknown format "reel"/,
  );
  assert.throws(() => newJob("Bad Slug", {}, tmp), /bad slug/);
  const dir = newJob("story", { format: "image", size: "story" }, tmp);
  const s = jobState("story", tmp);
  assert.equal(s.format, "image");
  assert.equal(s.size, "story");
  setStage(dir, "03-render");
  assert.throws(() => jobState("story", tmp), /copy\.md/);
  const p = join(dir, "STATUS.md");
  writeFileSync(p, readFileSync(p, "utf8").replace(/^size:.*$/m, "size: huge"));
  assert.throws(() => jobState("story", tmp), /unknown size "huge"/);
});

test("new refuses an existing job and an unknown stage is reported", () => {
  const dir = newJob("twice", {}, tmp);
  assert.throws(() => newJob("twice", {}, tmp), /already exists/);
  setStage(dir, "05-post");
  assert.throws(() => jobState("twice", tmp), /unknown stage "05-post"/);
});
