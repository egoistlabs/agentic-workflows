// A plan walks from 00-brief to done through route, one approval at a time.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadStages, newPlan, planState } from "../src/core/index.js";

const cwd = mkdtempSync(join(tmpdir(), "agentic-smm-"));
after(() => rmSync(cwd, { recursive: true, force: true }));

const main = fileURLToPath(new URL("../src/cli/main.ts", import.meta.url));
const tsx = import.meta.resolve("tsx");
const route = (slug: string) =>
  execFileSync(process.execPath, ["--import", tsx, main, "route", slug], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const setStage = (dir: string, stage: string) => {
  const status = join(dir, "STATUS.md");
  writeFileSync(
    status,
    readFileSync(status, "utf8").replace(/^stage:.*$/m, `stage: ${stage}`),
  );
};

test("new writes STATUS.md with defaults and refuses an existing plan", () => {
  const dir = newPlan("defaults", {}, cwd);
  const status = readFileSync(join(dir, "STATUS.md"), "utf8");
  assert.match(status, /^weeks: 4$/m);
  assert.match(status, /^per-week: 7$/m);
  assert.match(status, new RegExp(`^brand: ${join(cwd, "brand")}$`, "m"));
  assert.match(status, /^learnings: .*brand\/learnings\.md$/m);
  assert.match(status, /^stage: 00-brief$/m);
  assert.match(status, /^## Log$/m);
  assert.throws(() => newPlan("defaults", {}, cwd), /already exists/);
});

test("route walks an empty plan to 10-review and then done", () => {
  const dir = newPlan("walk", { weeks: 2, perWeek: 3 }, cwd);
  const { stages, checkpoints } = loadStages();
  assert.equal(stages.length, 11);
  const seen: string[] = [];
  for (;;) {
    const out = route("walk");
    const s = planState("walk", cwd);
    if (s.stage === "done") {
      assert.match(out, /Plan done/);
      break;
    }
    seen.push(s.stage);
    assert.match(out, new RegExp(`^Stage: ${s.stage}$`, "m"));
    assert.match(out, /2 weeks × 3 posts per week = 6 slots/);
    assert.match(out, new RegExp(`^# ${s.stage.slice(0, 2)} `, "m"));
    const file = checkpoints[s.stage];
    if (file) {
      assert.equal(s.checkpoint?.file, file);
      assert.match(out, /Checkpoint: this stage ends/);
      writeFileSync(join(dir, s.stage, file), "draft\n");
      assert.match(route("walk"), /CHECKPOINT: .* waits for human approval/);
      writeFileSync(join(dir, s.stage, file), "draft\n\napproved: yes\n");
      assert.match(route("walk"), /is approved/);
    } else assert.equal(s.checkpoint, undefined);
    setStage(dir, s.next ?? "done");
  }
  assert.deepEqual(seen, stages);
  assert.equal(seen.at(-1), "10-review");
});

test("skipping an unapproved checkpoint throws", () => {
  const dir = newPlan("skip", {}, cwd);
  setStage(dir, "02-audience");
  assert.throws(
    () => planState("skip", cwd),
    /01-story-bank\/stories\.md is not approved/,
  );
  assert.throws(() => route("skip"), /not approved/);
  writeFileSync(join(dir, "01-story-bank", "stories.md"), "approved: yes\n");
  assert.equal(planState("skip", cwd).stage, "02-audience");
  setStage(dir, "done");
  assert.throws(() => planState("skip", cwd), /03-trends\/topics\.md/);
});

test("route prints the brand learnings when they exist", () => {
  newPlan("learn", { brand: "." }, cwd);
  assert.match(route("learn"), /Learnings: none yet/);
  writeFileSync(
    join(cwd, "learnings.md"),
    "- 2026-10-24: lead with the number in the hook\n",
  );
  assert.match(route("learn"), /lead with the number in the hook/);
});

test("new rejects bad counts and slugs", () => {
  assert.throws(() => newPlan("bad", { weeks: 0 }, cwd), /--weeks/);
  assert.throws(() => newPlan("../x", {}, cwd), /slug/);
});
