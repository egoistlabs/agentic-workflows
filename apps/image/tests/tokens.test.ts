import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  colourTokens,
  fontFace,
  fontFamilies,
  fontFamily,
  loadTokens,
  missingTokens,
  requiredTokens,
  root,
  sharedLayouts,
  tokensCss,
  unsetVars,
} from "../src/core/index.ts";

const size = { width: 1080, height: 1350 };

test("each token x becomes --x on .slide, references kept as they are", () => {
  const t = { ...loadTokens(), bg: "#1a1c22", accent: "#4f8cff" };
  const css = tokensCss(t, size, "/font/geist-variable.woff2");
  assert.match(css, /^\.slide \{$/m);
  assert.match(css, /^ {2}--bg: #1a1c22;$/m);
  assert.match(css, /^ {2}--accent: #4f8cff;$/m);
  assert.match(css, /^ {2}--typeTitle: 80px;$/m);
  // Tokens may refer to each other; the browser resolves them on the slide.
  assert.match(
    css,
    /^ {2}--surface: color-mix\(in srgb, var\(--fg\) 8%, var\(--bg\)\);$/m,
  );
  assert.match(css, /^ {2}--accentFg: var\(--bg\);$/m);
  assert.match(css, /--slideW: 1080px;/);
  assert.match(css, /--slideH: 1350px;/);
  for (const k of Object.keys(t))
    assert.ok(css.includes(`--${k}: `), `--${k} is set`);
});

test("the brand font becomes an @font-face for the token's first family", () => {
  const t = loadTokens();
  assert.equal(fontFamily(t), "Geist");
  assert.equal(
    fontFamily({ font: '"Inter Display", sans-serif' }),
    "Inter Display",
  );
  const face = fontFace(t, "/font/geist-variable.woff2");
  assert.match(face, /font-family: "Geist";/);
  assert.match(
    face,
    /src: url\("\/font\/geist-variable\.woff2"\) format\("woff2"\);/,
  );
  assert.match(face, /font-display: block;/);
  assert.throws(
    () => fontFace({ ...t, fontFile: "geist.svg" }, "/f"),
    /must be a \.woff2/,
  );
  assert.throws(() => fontFamily({}), /"font" is missing/);
});

test("an optional mono font gets its own @font-face and joins the allowed families", () => {
  const t = loadTokens();
  assert.deepEqual(fontFamilies(t), ["Geist"]);
  assert.doesNotMatch(tokensCss(t, size, "/font/g.woff2"), /Geist Mono/);
  const m = {
    ...t,
    fontMono: '"Geist Mono", monospace',
    fontMonoFile: "geist-mono.woff2",
  };
  assert.deepEqual(fontFamilies(m), ["Geist", "Geist Mono"]);
  assert.equal(fontFamily(m, "mono"), "Geist Mono");
  const css = tokensCss(m, size, "/font/g.woff2", "/font/geist-mono.woff2");
  assert.match(css, /font-family: "Geist Mono";/);
  assert.match(css, /src: url\("\/font\/geist-mono\.woff2"\)/);
  assert.ok(!colourTokens(m).includes("fontMono"));
  assert.throws(() => tokensCss(m, size, "/font/g.woff2"), /fontMono/);
});

test("a missing or empty required token, or an unsafe value, is refused", () => {
  const t = loadTokens();
  assert.deepEqual(missingTokens(t), []);
  assert.ok(requiredTokens().includes("typeMin"));
  const { accent: _, ...noAccent } = t;
  assert.deepEqual(missingTokens({ ...noAccent, bg: " " }), ["bg", "accent"]);
  assert.throws(
    () => tokensCss({ ...noAccent }, size, "/f.woff2"),
    /brand tokens missing: accent/,
  );
  assert.throws(
    () =>
      tokensCss({ ...t, bg: "red; } body { display: none" }, size, "/f.woff2"),
    /token "bg" has a value CSS can't hold/,
  );
});

test("colour tokens are the ones holding colours, not sizes or fonts", () => {
  const c = colourTokens(loadTokens());
  for (const k of [
    "bg",
    "fg",
    "accent",
    "accentGlow",
    "muted",
    "surface",
    "line",
    "accentFg",
  ])
    assert.ok(c.includes(k), `${k} is a colour`);
  for (const k of [
    "font",
    "fontFile",
    "typeBody",
    "space1",
    "radiusMd",
    "weightStrong",
  ])
    assert.ok(!c.includes(k), `${k} is not a colour`);
});

test("a property a layout reads but no token sets is reported", () => {
  const t = loadTokens();
  const css =
    ".x { --local: 2; color: var(--accent); width: calc(var(--local) * var(--space1)); height: var(--slideH); gap: var(--gutter); }";
  assert.deepEqual(unsetVars(css, t), ["gutter"]);
});

// Layout CSS reads only token properties: no colour, font or size literals.
const sheets = () => {
  const out: string[] = [join(root, "renderer", "slide.css")];
  for (const name of readdirSync(sharedLayouts))
    out.push(join(sharedLayouts, name, "layout.css"));
  return out;
};

/** Colour, font and size literals in a stylesheet, which layouts may not hold. */
function cssProblems(raw: string): string[] {
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");
  const problems: string[] = [];
  const flag = (re: RegExp, what: string) => {
    for (const m of css.matchAll(re)) problems.push(`${what}: ${m[0]}`);
  };
  flag(/#[\da-f]{3,8}\b/gi, "hex colour");
  flag(/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi, "colour function");
  flag(
    /:[^;{}]*\b(white|black|red|green|blue|gray|grey|orange|yellow)\b/gi,
    "named colour",
  );
  flag(/\d+(\.\d+)?(px|pt|rem)\b/g, "fixed size");
  flag(/font-size\s*:(?![^;]*var\(--)[^;]*;/g, "font-size without a token");
  flag(
    /font-family\s*:(?!\s*var\(--font\))[^;]*;/g,
    "font-family other than var(--font)",
  );
  flag(/font-weight\s*:(?!\s*var\(--)[^;]*;/g, "font-weight without a token");
  flag(
    /border-radius\s*:(?![^;]*var\(--|\s*50%)[^;]*;/g,
    "radius without a token",
  );
  return problems;
}

test("the CSS check catches literals", () => {
  const bad = `.x { color: #4f8cff; background: rgb(0 0 0 / .5); font-size: 40px;
    font-family: Inter, sans-serif; font-weight: 700; border-radius: 12px; outline-color: white; }`;
  assert.deepEqual(cssProblems(bad), [
    "hex colour: #4f8cff",
    "colour function: rgb(",
    "named colour: : white",
    "fixed size: 40px",
    "fixed size: 12px",
    "font-size without a token: font-size: 40px;",
    "font-family other than var(--font): font-family: Inter, sans-serif;",
    "font-weight without a token: font-weight: 700;",
    "radius without a token: border-radius: 12px;",
  ]);
  assert.deepEqual(
    cssProblems(
      ".x { font-size: var(--typeBody); border-radius: 50%; color: var(--fg); }",
    ),
    [],
  );
});

test("layout CSS has no colour literals, px sizes or raw fonts", () => {
  const files = sheets();
  assert.ok(files.length >= 5, "slide.css and the four layouts");
  const problems = files.flatMap((f) =>
    cssProblems(readFileSync(f, "utf8")).map(
      (p) => `${f.slice(root.length + 1)}: ${p}`,
    ),
  );
  assert.deepEqual(problems, []);
});
