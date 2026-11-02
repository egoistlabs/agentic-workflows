import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import {
  defaultBrand,
  fontPath,
  fontWarning,
  loadTokens,
  packTokens,
  resolveBrand,
  tokenSources,
} from "../src/core/index.ts";

const tmp = mkdtempSync(join(tmpdir(), "agentic-image-brand-"));
after(() => rmSync(tmp, { recursive: true, force: true }));

// A pack written for agentic-video: colours and fonts only, no image tokens.
const videoOnly = {
  bg: "#1a1c22",
  fg: "#f2f2f0",
  accent: "#4f8cff",
  accentGlow: "rgba(79,140,255,.18)",
  muted: "#a9adb6",
  hookBg: "rgba(26,28,34,0.78)",
  hookFg: "#f2f2f0",
  font: "Geist, sans-serif",
  fontFile: "geist-variable.woff2",
};

function pack(name: string, tokens: object, font?: string): string {
  const dir = join(tmp, name, "brand");
  mkdirSync(join(dir, "assets"), { recursive: true });
  writeFileSync(join(dir, "tokens.json"), JSON.stringify(tokens));
  if (font) writeFileSync(join(dir, "assets", font), "");
  return dir;
}

test("the default pack has the image tokens and its font", () => {
  const t = loadTokens();
  for (const k of [
    "bg",
    "fg",
    "accent",
    "muted",
    "font",
    "fontFile",
    "typeMin",
    "typeBody",
    "space1",
    "radiusMd",
    "safeX",
    "safeY",
  ])
    assert.ok(t[k], `default sets ${k}`);
  assert.ok(parseInt(t.typeMin!) >= 24, "typeMin readable on a phone");
  assert.ok(existsSync(fontPath()));
  assert.ok(existsSync(join(defaultBrand, "assets", "OFL.txt")));
  assert.equal(fontWarning(), undefined);
});

test("a video-only pack merges over the default with nothing missing", () => {
  const dir = pack("video-only", videoOnly, "geist-variable.woff2");
  const merged = loadTokens(dir);
  for (const k of Object.keys(packTokens(defaultBrand)))
    assert.ok(merged[k], `merged has ${k}`);
  assert.equal(merged.bg, "#1a1c22");
  assert.equal(merged.typeMin, loadTokens().typeMin);
  const src = tokenSources(dir);
  assert.deepEqual(src.set.sort(), [
    "accent",
    "accentGlow",
    "bg",
    "fg",
    "font",
    "fontFile",
    "muted",
  ]);
  assert.deepEqual(src.unused.sort(), ["hookBg", "hookFg"]);
  assert.ok(src.fromDefault.includes("typeBody"));
  assert.equal(fontPath(dir), join(dir, "assets", "geist-variable.woff2"));
  assert.equal(fontWarning(dir), undefined);
});

test("a pack that names a font without its file is flagged", () => {
  const dir = pack("nofile", { font: "Inter, sans-serif" });
  assert.match(fontWarning(dir) ?? "", /no fontFile/);
  const missing = pack("missing", { font: "Inter", fontFile: "inter.woff2" });
  assert.match(fontWarning(missing) ?? "", /not found/);
});

test("the optional mono font loads from the pack that sets it", () => {
  assert.equal(fontPath(undefined, true), undefined);
  const dir = pack(
    "mono",
    { ...videoOnly, fontMono: "Geist Mono", fontMonoFile: "geist-mono.woff2" },
    "geist-variable.woff2",
  );
  assert.match(fontWarning(dir) ?? "", /geist-mono\.woff2 not found/);
  writeFileSync(join(dir, "assets", "geist-mono.woff2"), "");
  assert.equal(fontWarning(dir), undefined);
  assert.equal(fontPath(dir, true), join(dir, "assets", "geist-mono.woff2"));
  const nofile = pack("mono-nofile", { ...videoOnly, fontMono: "Geist Mono" });
  assert.match(fontWarning(nofile) ?? "", /no fontMonoFile/);
});

test("brand resolution: --brand, else ./brand, else the default", () => {
  const dir = pack("resolve", videoOnly);
  const cwd = join(tmp, "resolve");
  assert.equal(resolveBrand(cwd), dir);
  assert.equal(resolveBrand(cwd, "brand"), dir);
  assert.equal(resolveBrand(tmp), defaultBrand);
  assert.throws(() => resolveBrand(tmp, "nowhere"), /has no tokens\.json/);
  const bad = pack("bad", { bg: { nested: true } });
  assert.throws(() => loadTokens(bad), /must be a string or number/);
});

test("an image section overrides the pack's tokens for slides only", () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-image-tokens-"));
  writeFileSync(
    join(dir, "tokens.json"),
    JSON.stringify({
      bg: "#1a1c22",
      fg: "#f2f2f0",
      image: { bg: "#f2f2f0", fg: "#1a1c22" },
    }),
  );
  const t = loadTokens(dir);
  assert.equal(t.bg, "#f2f2f0");
  assert.equal(t.fg, "#1a1c22");
  assert.equal(t.image, undefined);
  writeFileSync(join(dir, "tokens.json"), JSON.stringify({ image: ["x"] }));
  assert.throws(() => packTokens(dir), /"image" must be an object/);
  rmSync(dir, { recursive: true });
});
