// Checks a built video against MOTION_PHILOSOPHY rules that can be measured
// from timeline.json, the audio, the cut and the stills sidecar. Writes 06-qa/qa.md.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { probeDuration } from "./ff.js";
import {
  videoDir,
  loadFormat,
  readJson,
  statusField,
  explainer,
  footageFirst,
} from "./files.js";
import { modeAt } from "./layout.js";
import { medianLuma, readPng } from "./png.js";
import {
  type Rect,
  type StillLog,
  type Word,
  loadProps,
  measureLoudness,
} from "./render.js";
import type { KeepBeat } from "./source.js";

export interface Check {
  rule: string;
  ok: boolean;
  detail: string;
  /** Passes, but a human should look. */
  warn?: boolean;
}

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Characters that render as colour emoji (boxes without an emoji font). */
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;

export function qa(slug: string): { checks: Check[]; report: string } {
  const dir = videoDir(slug);
  const format = loadFormat(statusField(dir, "format") ?? "");
  const th = footageFirst(format);
  const ex = explainer(format);
  const { timeline: tl, words, face } = loadProps(dir);
  const checks: Check[] = [];
  const add = (rule: string, ok: boolean, detail: string, warn = false) =>
    checks.push({ rule, ok, detail, warn });
  const asset = (p: string) => join(dir, "assets", p);

  const hook = tl.hook;
  // Only footage formats may carry the payoff natively (talking-head: a native element;
  // explainer: the canvas title); motion formats keep the title (R1m).
  const carried = th && hook?.show === false;
  add(
    "R1 payoff legible at frame 0",
    !!hook?.text && (carried || (hook.until ?? 2.8) >= 2.5),
    !hook?.text
      ? "timeline.hook.text is missing"
      : carried
        ? `"${hook.text}" carried by the scenes (hook.show: false); confirm frame 0 in the stills review`
        : `"${hook.text}" until ${hook.until ?? 2.8}s`,
    carried,
  );
  add(
    "R2 number or counted promise in hook",
    !!hook?.text &&
      /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(
        hook.text,
      ),
    hook?.text ?? "no hook",
  );

  const cta = tl.scenes.find((s) => s.id === "cta");
  const ctaLen = cta ? tl.duration - cta.start : 0;
  add(
    "R8 one CTA held at the end",
    !!cta && ctaLen >= 3,
    cta
      ? `cta from ${cta.start}s, ${ctaLen.toFixed(1)}s long`
      : 'no scene with id "cta"',
  );

  // R3: absolute event times = scene start + its events (scene starts count).
  const events = tl.scenes
    .flatMap((s) => [s.start, ...(s.events ?? []).map((e) => s.start + e)])
    .filter((t) => !cta || t <= cta.start)
    .sort((a, b) => a - b);
  const gaps = events
    .slice(1)
    .map((t, i) => ({ at: events[i]!, gap: t - events[i]! }))
    .filter((g) => g.gap > format.maxGap);
  add(
    `R3 something new every ≤${format.maxGap}s`,
    gaps.length === 0,
    gaps.length
      ? gaps
          .map((g) => `${g.gap.toFixed(1)}s gap after ${g.at.toFixed(1)}s`)
          .join("; ")
      : `${events.length} events before the CTA`,
  );
  const missingEvents = tl.scenes.filter(
    (s) => s.id !== "cta" && !s.events?.length,
  );
  if (missingEvents.length)
    add(
      "R3 events listed",
      false,
      `scenes without events: ${missingEvents.map((s) => s.id).join(", ")}`,
    );

  if (tl.audio) {
    const file = asset(tl.audio);
    if (!existsSync(file)) add("audio present", false, `${tl.audio} not found`);
    else {
      const d = probeDuration(file);
      add(
        "duration covers the audio",
        tl.duration >= d - 0.05,
        `audio ${d.toFixed(2)}s, timeline ${tl.duration}s`,
      );
    }
    add(
      "R5 word-synced captions",
      words.length > 0 && tl.captions?.style !== "none",
      words.length
        ? `${words.length} words, style ${tl.captions?.style ?? "lower"}`
        : "no words.json",
    );
  }

  if (th) {
    add(
      "T5 captions word by word",
      tl.captions?.style === "word",
      `captions.style "${tl.captions?.style ?? "lower"}"${tl.captions?.style === "word" ? "" : `; ${format.name} uses "word"`}`,
    );
    const src = tl.footage?.src;
    add(
      "T1 footage layer",
      !!src && existsSync(asset(src)),
      src
        ? existsSync(asset(src))
          ? `${src} under every scene`
          : `${src} not found`
        : "timeline.footage is missing",
    );

    if (
      src &&
      tl.audio &&
      existsSync(asset(src)) &&
      existsSync(asset(tl.audio))
    ) {
      const v = probeDuration(asset(src), "v");
      const a = probeDuration(asset(tl.audio));
      add(
        "A/V in sync",
        Math.abs(a - v) <= 0.05,
        `${tl.audio} ${a.toFixed(3)}s vs ${src} ${v.toFixed(3)}s (${(a - v >= 0 ? "+" : "") + (a - v).toFixed(3)}s, limit 0.05s)`,
      );
    }

    const keepPath = join(dir, "03-source", "keep.json");
    const srcWords = join(dir, "03-source", "words.json");
    if (existsSync(keepPath) && existsSync(srcWords)) {
      const raw = readJson<KeepBeat[] | { keep: KeepBeat[] }>(keepPath);
      const keep = Array.isArray(raw) ? raw : raw.keep;
      const all = readJson<Word[]>(srcWords);
      const want = keep.flatMap((k) =>
        all.slice(k.from, k.to + 1).map((w) => w.t),
      );
      const got = words.map((w) => w.t);
      const lost = want.filter((t, i) => got[i] !== t);
      add(
        "every kept word captioned",
        lost.length === 0 && got.length === want.length,
        lost.length || got.length !== want.length
          ? `${want.length} kept, ${got.length} in ${tl.words ?? "words"}; first mismatch: "${lost[0] ?? "(length)"}"`
          : `${want.length} words`,
      );
    }

    // T4: no overlay over the face, mouth or mic. Zones log their rects while stills render.
    const sidecar = join(dir, "06-qa", "zones.json");
    const stills = existsSync(sidecar)
      ? readJson<{ stills: StillLog[] }>(sidecar).stills
      : [];
    if (!face)
      add(
        "T4 overlays clear of the face",
        true,
        "no assets/face.json (run agentic-video face); zones used the fixed boxes and were not checked",
        true,
      );
    else if (!stills.length)
      add(
        "T4 overlays clear of the face",
        true,
        "no stills rendered yet; run agentic-video stills",
        true,
      );
    else {
      const hits = stills.flatMap((s) =>
        // Forced: no single spot clears the face for the zone's whole span, even if this still misses it.
        s.zones
          .filter(
            (z) => z.forced || (z.keepOut && intersects(z.rect, z.keepOut)),
          )
          .map(
            (z) =>
              `${z.id} at ${s.t}s${z.forced ? " (no spot clear of the face for its whole span: shorten from/to or change place)" : ""}`,
          ),
      );
      const n = stills.reduce((k, s) => k + s.zones.length, 0);
      add(
        "T4 overlays clear of the face",
        hits.length === 0,
        hits.length
          ? `over the keep-out box: ${hits.join("; ")}`
          : `${n} zone rects in ${stills.length} stills`,
      );
    }
  }

  if (ex) explainerChecks(dir, tl, format.faceShare ?? [0, 1], add);

  // Caption contrast: a light background behind captions with no stroke.
  const sidecar = join(dir, "06-qa", "zones.json");
  if (existsSync(sidecar)) {
    const light = readJson<{ stills: StillLog[] }>(sidecar)
      .stills.filter(
        (s) => s.captions && !s.captions.stroke && existsSync(s.file),
      )
      .map((s) => ({
        t: s.t,
        l: medianLuma(readPng(s.file), s.captions!.rect),
      }))
      .filter((x) => x.l > 0.6);
    if (light.length)
      add(
        "caption contrast",
        true,
        `light background behind unstroked captions at ${light.map((x) => `${x.t}s (${x.l.toFixed(2)})`).join(", ")}`,
        true,
      );
  }

  // Emoji render as boxes in headless Chrome unless an emoji font is bundled.
  const scenes = join(dir, "05-build", "scenes.jsx");
  if (existsSync(scenes)) {
    const lines = readFileSync(scenes, "utf8").split("\n");
    const hits = lines.flatMap((l, i) =>
      EMOJI.test(l) ? [`line ${i + 1}: ${l.match(EMOJI)![0]}`] : [],
    );
    const font = [join(dir, "assets"), join(dir, "assets", "brand")].some(
      (d) =>
        existsSync(d) &&
        readdirSync(d).some((f) => /emoji.*\.(ttf|otf|woff2?)$/i.test(f)),
    );
    if (hits.length && !font)
      add(
        "no emoji without an emoji font",
        false,
        `${hits.slice(0, 5).join("; ")} (they render as boxes; use text or SVG)`,
      );
  }

  // Loudness of the rendered file (render normalises to -14 LUFS).
  const video = join(dir, "07-render", `${slug}.mp4`);
  if (existsSync(video) && (tl.audio || tl.sfx?.length)) {
    const l = measureLoudness(video);
    const i = Number(l.input_i);
    const tp = Number(l.input_tp);
    // Render targets -1.5 dBTP; AAC encoding adds up to ~0.5 dB of true peak.
    add(
      "loudness −14 LUFS, TP ≤ −0.5 dB",
      Math.abs(i + 14) <= 1 && tp <= -0.5,
      `${i.toFixed(1)} LUFS, ${tp.toFixed(1)} dBTP`,
    );
  }

  const ok = checks.every((c) => c.ok);
  const report = [
    `# QA: ${slug}`,
    "",
    `result: ${ok ? "pass" : "fail"}`,
    "",
    "| Check | Result | Detail |",
    "| --- | --- | --- |",
    ...checks.map(
      (c) =>
        `| ${c.rule} | ${!c.ok ? "**fail**" : c.warn ? "warn" : "pass"} | ${c.detail} |`,
    ),
    "",
  ].join("\n");
  mkdirSync(join(dir, "06-qa"), { recursive: true });
  // Keep the stills review and loudness sections written after an earlier run.
  const path = join(dir, "06-qa", "qa.md");
  const kept = existsSync(path)
    ? (readFileSync(path, "utf8").match(/\n## [\s\S]*$/)?.[0] ?? "")
    : "";
  writeFileSync(path, report + kept);
  return { checks, report };
}

type Add = (rule: string, ok: boolean, detail: string, warn?: boolean) => void;
type TL = ReturnType<typeof loadProps>["timeline"];

/** Explainer rules X1, X2, X5 and the head break-out, from the layout track, hero times and the stills sidecar. */
function explainerChecks(
  dir: string,
  tl: TL,
  [lo, hi]: [number, number],
  add: Add,
) {
  const layout = tl.footage?.layout;
  if (!layout?.length) {
    add(
      "X1 layout track",
      false,
      "timeline.footage.layout is missing; add a layout to cues.json and run timeline",
    );
    return;
  }
  const cta = tl.scenes.find((s) => s.id === "cta")?.start ?? tl.duration;
  const segs = layout.map((l, i) => ({
    ...l,
    to: layout[i + 1]?.from ?? tl.duration,
  }));
  const time = { face: 0, split: 0, canvas: 0 };
  for (const s of segs)
    time[s.mode] += Math.max(0, Math.min(s.to, cta) - s.from);
  const face = time.face / cta;
  const long = segs
    .filter(
      (s) =>
        (s.mode === "face" && s.to - s.from > 9) ||
        (s.mode === "split" && s.to - s.from > 20),
    )
    .map(
      (s) =>
        `${s.mode} ${(s.to - s.from).toFixed(1)}s at ${s.from.toFixed(1)}s`,
    );
  const canvas = time.canvas / cta;
  const bad = [
    ...(face < lo || face > hi
      ? [`face ${(face * 100).toFixed(0)}% (want ${lo * 100}–${hi * 100}%)`]
      : []),
    ...(canvas > 0.1
      ? [`canvas ${(canvas * 100).toFixed(0)}% (at most 10%)`]
      : []),
    ...long.map((l) => `${l} (face ≤ 9s, split ≤ 20s)`),
  ];
  add(
    "X1 two layouts, one job each",
    bad.length === 0,
    bad.length
      ? bad.join("; ")
      : `face ${(face * 100).toFixed(0)}%, split ${((time.split / cta) * 100).toFixed(0)}%, canvas ${(canvas * 100).toFixed(0)}% before the CTA`,
  );

  // X2: the hero object at every section start (not the opening or the CTA) and in a recap.
  const hero = tl.hero ?? [];
  if (!hero.length)
    add(
      "X2 hero object returns",
      true,
      "no hero times in cues.json; confirm the hero object in the stills review",
      true,
    );
  else {
    const sections = tl.scenes.filter((s, i) => i > 0 && s.id !== "cta");
    const missing = sections.filter(
      (s, i) =>
        !hero.some((t) => t >= s.start && t < (sections[i + 1]?.start ?? cta)),
    );
    const recap = hero.some((t) => t >= cta * 0.75 && t < cta);
    add(
      "X2 hero object returns",
      missing.length === 0 && recap,
      [
        missing.length
          ? `no hero in ${missing.map((s) => s.id).join(", ")}`
          : `${hero.length} hero times`,
        recap
          ? "recap before the CTA"
          : `no recap in the last 25% before the CTA (${(cta * 0.75).toFixed(1)}–${cta.toFixed(1)}s)`,
      ].join("; "),
    );
  }

  // X5: claim (≤ 12 words), then the name on a face punch-in by 5 s.
  const firstFace = segs.find((s) => s.mode === "face")?.from;
  const n = tl.hook?.text?.trim().split(/\s+/).length ?? 0;
  add(
    "X5 claim, name, count",
    n > 0 && n <= 12 && firstFace !== undefined && firstFace <= 5,
    `hook ${n} words; first face beat ${firstFace === undefined ? "missing" : `at ${firstFace.toFixed(1)}s`} (by 5s)`,
  );

  // Head break-out: the cut-out exists and captions never sit on the head.
  const alpha = tl.footage?.alpha;
  if (!alpha || !existsSync(join(dir, "assets", alpha)))
    add(
      "head break-out",
      true,
      "no assets/cut-alpha.webm (run agentic-video matte, then timeline); the card frames the whole head",
      true,
    );
  else {
    const sidecar = join(dir, "06-qa", "zones.json");
    const stills = existsSync(sidecar)
      ? readJson<{ stills: StillLog[] }>(sidecar).stills
      : [];
    const hits = stills.flatMap((st) => {
      const seg = segs.findLast((s) => s.from <= st.t + 1e-6);
      if (
        !st.captions ||
        seg?.mode !== "split" ||
        seg.headTop === undefined ||
        modeAt(layout, st.t) !== "split"
      )
        return [];
      return st.captions.rect.y + st.captions.rect.h > seg.headTop
        ? [`${st.t}s`]
        : [];
    });
    add(
      "head break-out",
      hits.length === 0,
      hits.length
        ? `captions over the head at ${hits.join(", ")}`
        : `${alpha}; captions clear of the head in ${stills.length} stills`,
    );
  }
}
