import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import {
  defaultBrand,
  findLayout,
  jobLayouts,
  layoutNames,
  newJob,
  renderTemplate,
  sharedLayouts,
  slidePage,
  validateDeck,
  wordCount,
} from "../src/core/index.ts";

const tmp = mkdtempSync(join(tmpdir(), "agentic-image-deck-"));
after(() => rmSync(tmp, { recursive: true, force: true }));
const job = newJob("deck", {}, tmp);
mkdirSync(join(job, "02-layout", "images"), { recursive: true });
writeFileSync(join(job, "02-layout", "images", "desk.jpg"), "");

const valid = () => ({
  slides: [
    {
      layout: "cover",
      fields: { kicker: "For developers", title: "Your hook" },
      image: { src: "images/desk.jpg", crop: "cover", position: "50% 30%" },
    },
    {
      layout: "note",
      fields: {
        title: "A point",
        quote: "“Said out loud.”",
        body: "Why it matters.",
      },
    },
    {
      layout: "checklist",
      fields: { title: "Check", items: ["one", "two", "three"] },
    },
    {
      layout: "closing",
      fields: { title: "Takeaway", cta: "Follow for more" },
    },
  ],
});

const errorsOf = (deck: unknown, format?: string) => {
  try {
    validateDeck(deck, job, defaultBrand, format);
    return [];
  } catch (e) {
    return (e as Error).message
      .split("\n")
      .slice(1)
      .map((l) => l.trim());
  }
};

test("the four shared layouts declare their fields and limits", () => {
  for (const name of ["cover", "note", "checklist", "closing"]) {
    const l = findLayout(name);
    assert.ok(l, `${name} exists`);
    assert.equal(l.source, "shared");
    assert.ok(l.decl.fields.title?.required, `${name} requires a title`);
  }
  const items = findLayout("checklist")!.decl.fields.items!;
  assert.equal(items.type, "list");
  assert.deepEqual(items.type === "list" && [items.min, items.max], [3, 6]);
  assert.equal(findLayout("cover")!.decl.image, "optional");
  assert.equal(findLayout("note")!.decl.image, "none");
  assert.ok(findLayout("note")!.decl.fields.quote, "note has dialogue");
});

test("a valid deck resolves its layouts and images", () => {
  const slides = validateDeck(valid(), job, defaultBrand);
  assert.equal(slides.length, 4);
  assert.deepEqual(
    slides.map((s) => s.layout.name),
    ["cover", "note", "checklist", "closing"],
  );
  assert.deepEqual(slides[0]!.image, {
    file: join(job, "02-layout", "images", "desk.jpg"),
    url: "/job/images/desk.jpg",
    crop: "cover",
    position: "50% 30%",
    alt: "",
  });
  // brand:<file> resolves into the brand's assets/.
  const brand = join(tmp, "brand");
  mkdirSync(join(brand, "assets"), { recursive: true });
  writeFileSync(join(brand, "tokens.json"), "{}");
  writeFileSync(join(brand, "assets", "me.png"), "");
  const [s] = validateDeck(
    {
      slides: [
        {
          layout: "cover",
          fields: { title: "Hi" },
          image: { src: "brand:me.png", alt: "Me" },
        },
      ],
    },
    job,
    brand,
  );
  assert.deepEqual(s!.image, {
    file: join(brand, "assets", "me.png"),
    url: "/brand/me.png",
    crop: "cover",
    position: "50% 50%",
    alt: "Me",
  });
});

test("deck validation names the slide and the problem", () => {
  const d = valid();
  d.slides[0]!.layout = "hero";
  delete (d.slides[1]!.fields as Record<string, string>).title;
  d.slides[2]!.fields.items = ["one", "two"];
  (d.slides[3]!.fields as Record<string, unknown>).cta =
    "one two three four five six seven eight nine ten eleven twelve thirteen";
  assert.deepEqual(errorsOf(d), [
    'slide 1 (hero): unknown layout "hero"; available: checklist, closing, cover, native, note',
    'slide 2 (note): missing required field "title"',
    'slide 3 (checklist): field "items" has 2 entries; checklist allows 3–6',
    'slide 4 (closing): field "cta" has 13 words; closing allows 12',
  ]);
});

test("more limits: items, unknown fields, images, keys, formats", () => {
  const d = valid();
  d.slides[2]!.fields.items = ["1", "2", "3", "4", "5", "6", "7"];
  assert.deepEqual(errorsOf(d), [
    'slide 3 (checklist): field "items" has 7 entries; checklist allows 3–6',
  ]);
  const e = valid();
  e.slides[2]!.fields.items = ["one", "two", "a b c d e f g h i j k"];
  (e.slides[1]!.fields as Record<string, string>).subtitle = "x";
  (e.slides[1] as Record<string, unknown>).image = { src: "images/desk.jpg" };
  (e.slides[3] as Record<string, unknown>).feilds = {};
  e.slides[0]!.image = {
    src: "../STATUS.md",
    crop: "fill",
    position: "center",
  };
  assert.deepEqual(errorsOf(e), [
    'slide 1 (cover): image crop "fill" must be cover or contain',
    'slide 1 (cover): image position "center" must be "x% y%", each 0–100',
    'slide 1 (cover): image src "../STATUS.md" must be images/<file> in 02-layout, or brand:<file> in the brand\'s assets/',
    'slide 2 (note): unknown field "subtitle"; note has label, title, quote, body',
    'slide 2 (note): note has no image; remove "image"',
    'slide 3 (checklist): field "items" entry 3 has 11 words; checklist allows 10 per entry',
    'slide 4 (closing): unknown key "feilds" (layout, fields, image)',
  ]);
  const f = valid();
  f.slides[0]!.image = {
    src: "images/missing.png",
    crop: "cover",
    position: "50% 50%",
  };
  assert.match(
    errorsOf(f)[0]!,
    /^slide 1 \(cover\): image images\/missing\.png not found/,
  );
  assert.deepEqual(errorsOf({ slides: valid().slides.slice(0, 2) }, "image"), [
    "an image job has one slide; deck.json has 2",
  ]);
  assert.deepEqual(errorsOf({ slides: [] }), ["deck.json has no slides"]);
  assert.throws(() => validateDeck([], job, defaultBrand), /"slides" list/);
});

test("word counts ignore dashes and emoji", () => {
  assert.equal(wordCount("Good at coding — but why? 🙂"), 5);
  assert.equal(wordCount("  "), 0);
});

test("a job's own layout comes before the shared one of the same name", () => {
  const own = join(jobLayouts(job), "note");
  cpSync(join(sharedLayouts, "note"), own, { recursive: true });
  writeFileSync(
    join(own, "layout.json"),
    JSON.stringify({
      use: "local",
      fields: { title: { type: "text", required: true, maxWords: 3 } },
      image: "none",
    }),
  );
  const local = findLayout("note", job)!;
  assert.equal(local.source, "job");
  assert.equal(local.dir, own);
  assert.equal(findLayout("note")!.source, "shared");
  assert.equal(findLayout("cover", job)!.source, "shared");
  // Validation uses the job's declaration.
  const d = valid();
  d.slides[1]!.fields = { title: "four words is many" };
  assert.deepEqual(errorsOf(d), [
    'slide 2 (note): field "title" has 4 words; note allows 3',
  ]);
  // A job-only layout resolves too.
  const extra = join(jobLayouts(job), "stamp-card");
  cpSync(join(sharedLayouts, "note"), extra, { recursive: true });
  assert.equal(findLayout("stamp-card", job)!.source, "job");
  assert.equal(findLayout("stamp-card"), undefined);
  assert.ok(layoutNames(job).includes("stamp-card"));
  // A local layout with a missing file fails with its name.
  mkdirSync(join(jobLayouts(job), "broken"));
  assert.throws(
    () => findLayout("broken", job),
    /layout "broken" .* is missing layout\.json, layout\.html, layout\.css/,
  );
  rmSync(jobLayouts(job), { recursive: true });
});

test("templates escape text, repeat lists and show optional fields only when set", () => {
  const tpl =
    "<h1>{{title}}</h1>{{#body}}<p>{{body}}</p>{{/body}}{{^body}}<i>none</i>{{/body}}" +
    '<ul>{{#items}}<li>{{@nn}} {{.}}</li>{{/items}}</ul>{{#image}}<img src="{{url}}">{{/image}}';
  assert.equal(
    renderTemplate(tpl, {
      title: "A <b>&</b>\nB",
      items: ["x", "y"],
      image: { url: "/job/images/a.jpg" },
    }),
    '<h1>A &lt;b&gt;&amp;&lt;/b&gt;<br>B</h1><i>none</i><ul><li>01 x</li><li>02 y</li></ul><img src="/job/images/a.jpg">',
  );
  assert.equal(
    renderTemplate("{{#body}}<p>{{body}}</p>{{/body}}", { body: "hi" }),
    "<p>hi</p>",
  );
  assert.throws(() => renderTemplate("{{#a}}x", {}), /never closed/);
  assert.throws(() => renderTemplate("{{#a}}x{{/b}}", {}), /closes/);
});

test("the slide page has the tokens, the base and each layout's stylesheet", () => {
  const slides = validateDeck(valid(), job, defaultBrand);
  const all = slidePage(slides, { title: "deck" });
  assert.match(all, /<link rel="stylesheet" href="\/tokens\.css">/);
  assert.match(all, /href="\/renderer\/slide\.css"/);
  for (const l of ["cover", "note", "checklist", "closing"])
    assert.match(all, new RegExp(`href="/layouts/${l}/layout\\.css"`));
  assert.equal(all.match(/<article class="slide /g)?.length, 4);
  assert.match(all, /class="slide layout-cover has-image" data-slide="1"/);
  assert.match(all, /object-fit: cover; object-position: 50% 30%/);
  const one = slidePage(slides, { title: "deck", only: 3 });
  assert.equal(one.match(/<article/g)?.length, 1);
  assert.match(one, /data-slide="3" data-layout="checklist"/);
  assert.match(one, /3\/4/);
  assert.match(one, /renderer\/guards\.js/);
  assert.throws(
    () => slidePage(slides, { title: "deck", only: 9 }),
    /no slide 9/,
  );
});
