// Real renders with Playwright. Skipped when no Chromium is found.
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import {
  jobLayouts,
  newJob,
  nextVersion,
  sharedLayouts,
} from "../src/core/index.ts";
import { chromiumCandidates, findChromium } from "../src/renderer/chromium.ts";
import { pngSize } from "../src/renderer/export.ts";
import { renderJob } from "../src/renderer/render.ts";

const tmp = mkdtempSync(join(tmpdir(), "agentic-image-render-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const skip = findChromium() ? false : "no Chromium found";

const deck = (slides: object[]) => JSON.stringify({ slides }, null, 2);
const twoSlides = deck([
  {
    layout: "cover",
    fields: { kicker: "For developers", title: "Two slides, one test" },
  },
  {
    layout: "checklist",
    fields: {
      title: "It renders",
      items: ["Tokens", "The real font", "The size"],
    },
  },
]);

function job(slug: string, deckJson: string, opts = {}): string {
  const dir = newJob(slug, opts, tmp);
  writeFileSync(join(dir, "02-layout", "deck.json"), deckJson);
  return dir;
}

test("Chromium lookup: Playwright's cache newest first, then system Chrome", () => {
  const home = join(tmp, "home");
  for (const d of [
    "chromium-1100",
    "chromium-1187",
    "chromium_headless_shell-1234",
  ])
    mkdirSync(join(home, ".cache", "ms-playwright", d), { recursive: true });
  const c = chromiumCandidates(home, {}, "linux");
  assert.equal(
    c[0],
    join(home, ".cache/ms-playwright/chromium-1187/chrome-linux/chrome"),
  );
  assert.ok(
    c.indexOf(
      join(home, ".cache/ms-playwright/chromium-1100/chrome-linux/chrome"),
    ) > 0,
  );
  assert.equal(c.at(-1), "/usr/bin/google-chrome");
  assert.throws(
    () =>
      findChromium({ PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: "/nowhere/chrome" }),
    /doesn't exist/,
  );
});

test("Chromium lookup covers macOS and Windows", () => {
  const home = join(tmp, "home-mac");
  mkdirSync(join(home, "Library", "Caches", "ms-playwright", "chromium-1200"), {
    recursive: true,
  });
  const mac = chromiumCandidates(home, {}, "darwin");
  assert.match(
    mac[0]!,
    /chromium-1200\/chrome-mac-arm64\/Google Chrome for Testing\.app/,
  );
  assert.ok(
    mac.includes(
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ),
  );

  const local = join(tmp, "AppData-Local");
  mkdirSync(join(local, "ms-playwright", "chromium-1200"), { recursive: true });
  // Windows paths can't exist on a POSIX test machine; point the cache at a real folder.
  const win = chromiumCandidates(
    "C:\\Users\\x",
    {
      PLAYWRIGHT_BROWSERS_PATH: join(local, "ms-playwright"),
      PROGRAMFILES: "C:\\Program Files",
    },
    "win32",
  );
  assert.ok(win[0]!.endsWith("chrome-win64\\chrome.exe"), win[0]);
  assert.ok(
    win.includes("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"),
  );
});

test("versions are the next free number, never refilled", () => {
  const dir = newJob("versions", {}, tmp);
  assert.equal(nextVersion(dir), 1);
  mkdirSync(join(dir, "03-render", "v1"));
  mkdirSync(join(dir, "03-render", "v3"));
  mkdirSync(join(dir, "03-render", "draft"));
  assert.equal(nextVersion(dir), 4);
});

test(
  "render refuses before copy approval; --draft renders a draft",
  { skip },
  async () => {
    const dir = job("two", twoSlides);
    await assert.rejects(
      renderJob("two", { cwd: tmp }),
      /copy\.md is not approved/,
    );
    assert.ok(!existsSync(join(dir, "03-render", "v1")));
    const d = await renderJob("two", { cwd: tmp, draft: true });
    assert.equal(d.version, undefined);
    assert.equal(d.dir, join(dir, "03-render", "draft"));
    assert.deepEqual(
      d.files.map((f) => f.slice(d.dir.length + 1)),
      ["01.png", "02.png"],
    );
    for (const f of d.files)
      assert.deepEqual(pngSize(f), { width: 1080, height: 1350 });
    assert.equal(
      JSON.parse(readFileSync(join(d.dir, "render.json"), "utf8")).draft,
      true,
    );
  },
);

test(
  "a 2-slide deck renders v1 at the job's pixel size",
  { skip },
  async () => {
    // The cover gets a photo: the draft's first slide, cropped and positioned.
    const withPhoto = JSON.parse(twoSlides);
    withPhoto.slides[0].image = {
      src: "images/photo.png",
      crop: "cover",
      position: "50% 30%",
    };
    const dir = job("version", JSON.stringify(withPhoto));
    mkdirSync(join(dir, "02-layout", "images"));
    cpSync(
      join(tmp, ".images", "two", "03-render", "draft", "01.png"),
      join(dir, "02-layout", "images", "photo.png"),
    );
    writeFileSync(join(dir, "01-copy", "copy.md"), "approved: yes\n");
    const r = await renderJob("version", { cwd: tmp });
    assert.equal(r.version, 1);
    assert.equal(r.dir, join(dir, "03-render", "v1"));
    assert.deepEqual(readdirSync(r.dir).sort(), [
      "01.png",
      "02.png",
      "deck.json",
      "render.json",
    ]);
    for (const f of r.files)
      assert.deepEqual(pngSize(f), { width: 1080, height: 1350 });
    const meta = JSON.parse(readFileSync(join(r.dir, "render.json"), "utf8"));
    assert.equal(meta.version, 1);
    assert.deepEqual(
      meta.slides.map((s: { layout: string }) => s.layout),
      ["cover", "checklist"],
    );
    assert.equal(nextVersion(dir), 2);
  },
);

test("a square job renders 1080×1080", { skip }, async () => {
  const dir = job("square", twoSlides, { size: "square" });
  writeFileSync(join(dir, "01-copy", "copy.md"), "approved: yes\n");
  const r = await renderJob("square", { cwd: tmp });
  assert.deepEqual(pngSize(r.files[0]!), { width: 1080, height: 1080 });
});

test(
  "export refuses a fallback font, a glyph the font lacks and a colour that isn't a token",
  { skip },
  async () => {
    const dir = job(
      "guards",
      deck([
        { layout: "cover", fields: { title: "Fine" } },
        { layout: "note", fields: { title: "日本語のタイトル", body: "♞" } },
        { layout: "loud", fields: { title: "Loud", body: "Serif" } },
      ]),
    );
    // A job-local layout that hardcodes a colour and a font.
    const loud = join(jobLayouts(dir), "loud");
    cpSync(join(sharedLayouts, "note"), loud, { recursive: true });
    writeFileSync(
      join(loud, "layout.css"),
      ".layout-loud .note-title { color: #ff0000; } .layout-loud .note-body { font-family: serif; }",
    );
    writeFileSync(join(dir, "01-copy", "copy.md"), "approved: yes\n");
    await assert.rejects(renderJob("guards", { cwd: tmp }), (e: Error) => {
      assert.match(e.message, /^refusing to export:/);
      assert.match(
        e.message,
        // Drawn by another installed font, or as empty boxes if no font has them.
        /slide 2 \(note\): h2\.title\.note-title (falls back to .+|has characters the brand font lacks, drawn as empty boxes: 日 本 語)/,
      );
      assert.match(
        e.message,
        /slide 2 \(note\): p\.prose\.note-body (falls back to .+; the brand font lacks those characters|has characters the brand font lacks, drawn as empty boxes: ♞)/,
      );
      assert.match(
        e.message,
        /slide 3 \(loud\): h2\.title\.note-title color is rgb\(255, 0, 0\), which is not a colour token/,
      );
      assert.match(
        e.message,
        /slide 3 \(loud\): p\.prose\.note-body font-family is serif, not Geist/,
      );
      assert.doesNotMatch(e.message, /slide 1/);
      return true;
    });
    // A failed render leaves no version behind.
    assert.deepEqual(readdirSync(join(dir, "03-render")), ["INSTRUCTIONS.md"]);
  },
);

test("a layout reading a property no token sets is refused before rendering", async () => {
  const dir = job("unset", deck([{ layout: "odd", fields: { title: "x" } }]));
  const odd = join(jobLayouts(dir), "odd");
  cpSync(join(sharedLayouts, "note"), odd, { recursive: true });
  writeFileSync(
    join(odd, "layout.css"),
    ".layout-odd h2 { color: var(--brandPink); }",
  );
  writeFileSync(join(dir, "01-copy", "copy.md"), "approved: yes\n");
  await assert.rejects(
    renderJob("unset", { cwd: tmp }),
    /slide 1 \(odd\): layout\.css reads var\(--brandPink\), which no token sets/,
  );
});

test("export refuses when the brand font doesn't load", { skip }, async () => {
  const brand = join(tmp, "broken-brand");
  mkdirSync(join(brand, "assets"), { recursive: true });
  writeFileSync(
    join(brand, "tokens.json"),
    JSON.stringify({
      font: "Brokenface, sans-serif",
      fontFile: "broken.woff2",
    }),
  );
  writeFileSync(join(brand, "assets", "broken.woff2"), "not a font");
  const dir = job("badfont", twoSlides, { brand });
  writeFileSync(join(dir, "01-copy", "copy.md"), "approved: yes\n");
  await assert.rejects(
    renderJob("badfont", { cwd: tmp }),
    /slide 1 \(cover\): font Brokenface did not load \(error\)/,
  );
});
