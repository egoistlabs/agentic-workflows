// The four v1 formats load and carry what the planner and producers need.
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatBrief, listFormats, loadFormat } from "../src/core/index.js";

test("all four formats load", () => {
  assert.deepEqual(
    listFormats().map((f) => f.id),
    ["carousel", "image", "reel", "text"],
  );
  for (const f of listFormats()) {
    assert.ok(f.structures.length > 0, f.id);
    assert.ok(f.metrics.length > 0, f.id);
    assert.ok(formatBrief(f).length > 0, f.id);
  }
});

test("manifests hold the documented limits and producers", () => {
  const reel = loadFormat("reel");
  assert.equal(reel.limits.beatWords, 25);
  assert.equal(reel.limits.lengthTolerance, 0.2);
  assert.equal(reel.producer.tool, "agentic-video");
  assert.equal(reel.producer.format, "talking-head");
  assert.deepEqual(reel.files.aspect, ["9:16"]);
  assert.equal(loadFormat("carousel").limits.slideWords, 30);
  assert.equal(loadFormat("image").limits.imageWords, 12);
  assert.equal(loadFormat("image").limits.captionWords, 150);
  assert.equal(loadFormat("text").limits.words, 120);
  assert.equal(loadFormat("text").files.max, 0);
});

test("unknown formats throw", () => {
  assert.throws(() => loadFormat("podcast"), /unknown format/);
});
