// Footage timeline generation (talking-head, explainer): 05-build/cues.json + the
// cut → timeline.json. Every cue sits on a spoken word; the camera reframes on every
// jump cut inside the face layout (T2); events come from cuts, reframes, layout
// switches and overlay events, so R3 holds by construction.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FaceTrack } from "./face.js";
import { probeVideo } from "./ff.js";
import { videoDir, loadFormat, readJson, statusField } from "./files.js";
import {
  type LayoutSeg,
  type Mode,
  MODES,
  frameSplit,
  modeAt,
} from "./layout.js";
import type { Timeline, Word } from "./render.js";
import type { CutMap } from "./source.js";

/** Times are a cue name or a bare word (first occurrence), with an optional ±offset: "impl+0.6", "Hey-0.08". */
type Ref = string | number;

export interface Cues {
  /** name → word, or [word, occurrence]. Exact match on the bare word, case-insensitive. */
  cues?: Record<string, string | [string, number]>;
  /** scene id → start. Order is by time; the first scene starts at 0. */
  scenes: Record<string, Ref>;
  /** scene id → times when an overlay changes (R3 events). */
  overlayEvents?: Record<string, Ref[]>;
  /** [from, to, zoom from, zoom to]: slow pushes, held 0.8 s after `to`. */
  pushes?: [Ref, Ref, number, number][];
  /** [from, to, saturation]: grade changes (0 = black and white). */
  grade?: [Ref, Ref, number][];
  /** [at, sound, volume]: sound is a file in assets/sfx/ without .wav. */
  sfx?: [Ref, string, number][];
  /** Seconds held after the last word. Default: the format's hold. */
  hold?: number;
  hook?: { text: string; show?: boolean; until?: number; sub?: string };
  /** Extra filler words for captions (e.g. particles of the spoken language). */
  stop?: string[];
  /** Caption fixes, merged over 03-source/fix.json. */
  fix?: Record<string, string>;
  /** Extra props for every scene (e.g. a page name). */
  props?: Record<string, unknown>;
  /** Reframe zoom cycle. Default wide/medium/tight (explainer: the format's split.pattern). */
  pattern?: number[];
  /** Explainer (X1): [at, mode] layout switches; the first applies from 0. */
  layout?: [Ref, Mode][];
  /** Explainer (X2): times the hero object shows (each section start, and the recap). */
  hero?: Ref[];
  /** Explainer (X6): [from word, to word] caption phrases set in the accent serif. */
  emphasis?: [Ref, Ref][];
  /** Explainer: share of the head above the split card's edge, overriding the format's (close-up takes need more). */
  popOut?: number;
}

const PATTERN = [1.0, 1.1, 1.0, 1.18, 1.06, 1.14];
/** Longest a framing holds before an extra reframe on a word start. */
const REFRAME_MAX = 2.6;
const REFRAME_MIN = 1.6;
const PUSH_HOLD = 0.8;

const bare = (t: string) =>
  t.toLowerCase().replace(/^[\s.,!?;:"“”'‘’()]+|[\s.,!?;:"“”'‘’()]+$/g, "");
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;

export interface TimelineReport {
  file: string;
  duration: number;
  cut: number;
  words: number;
  lines: string[];
  gaps: string[];
  /** Explainer layout problems against X1 (face share, segment lengths). */
  warnings: string[];
}

export function buildTimeline(slug: string): TimelineReport {
  const dir = videoDir(slug);
  const format = loadFormat(statusField(dir, "format") ?? "");
  const cuesPath = join(dir, "05-build", "cues.json");
  if (!existsSync(cuesPath)) throw new Error("05-build/cues.json is missing");
  const q = readJson<Cues>(cuesPath);
  for (const f of ["words-cut.json", "cut-map.json"])
    if (!existsSync(join(dir, "assets", f)))
      throw new Error(`assets/${f} is missing; run agentic-video cut first`);
  const words = readJson<Word[]>(join(dir, "assets", "words-cut.json"));
  const map = readJson<CutMap>(join(dir, "assets", "cut-map.json"));
  const fps = format.fps;
  const lines: string[] = [];

  // Cues: exact bare-word match with an explicit occurrence. Prefix matching
  // picked the wrong occurrence of short words ("the" in "own the stock").
  const context = (i: number) =>
    words
      .slice(Math.max(0, i - 2), i + 3)
      .map((w, j) => (j === Math.min(2, i) ? `[${w.t}]` : w.t))
      .join(" ");
  const findWord = (word: string, nth = 1) => {
    const hits = words.flatMap((w, i) => (bare(w.t) === bare(word) ? [i] : []));
    const i = hits[nth - 1];
    if (i === undefined)
      throw new Error(
        `cue word "${word}" #${nth} not found (${hits.length} match${hits.length === 1 ? "" : "es"} in words-cut.json)`,
      );
    return i;
  };
  const c: Record<string, number> = {};
  lines.push("Cues:");
  for (const [name, spec] of Object.entries(q.cues ?? {})) {
    const [word, nth] = Array.isArray(spec) ? spec : [spec, 1];
    const i = findWord(word, nth);
    c[name] = r3(words[i]!.s);
    lines.push(
      `  ${name.padEnd(12)} ${c[name]!.toFixed(2).padStart(6)}s  "${word}" #${nth}: ${context(i)}`,
    );
  }
  const speechEnd = r3(words[words.length - 1]?.e ?? map.duration);
  c.speechEnd = speechEnd;

  const at = (ref: Ref): number => {
    if (typeof ref === "number") return ref;
    const m = ref.trim().match(/^(.*?)([+-]\d+(?:\.\d+)?)?$/)!;
    const name = m[1]!;
    const base = name in c ? c[name]! : words[findWord(name)]!.s;
    return r3(base + Number(m[2] ?? 0));
  };

  const hold = q.hold ?? format.hold ?? 1;
  const duration = r2(Math.max(speechEnd + hold, map.duration));
  const frames = Math.ceil(duration * fps) + 2;

  // Layout track (explainer): hard switches on word starts, the first at 0.
  const warnings: string[] = [];
  let layout: LayoutSeg[] | undefined;
  if (q.layout?.length) {
    if (!format.split)
      throw new Error(
        `cues.json has a layout, but format ${format.name} has no split layout`,
      );
    const list = q.layout
      .map(([ref, mode]) => {
        if (!MODES.includes(mode))
          throw new Error(`layout mode "${mode}" (use ${MODES.join(", ")})`);
        return { from: Math.max(0, at(ref)), mode };
      })
      .sort((a, b) => a.from - b.from);
    list[0]!.from = 0;
    layout = list.filter((l, i) => i === 0 || l.mode !== list[i - 1]!.mode);
  } else if (format.split)
    lines.push(
      "warning: no layout in cues.json; the whole video uses the face layout",
    );

  // Camera: a new framing on every jump cut (and every switch into the face layout),
  // plus extra reframes on word starts in long segments, so no framing holds past
  // REFRAME_MAX (or the format's maxGap, if tighter: R3). Split and canvas segments
  // keep the card's framing (zoom 1).
  const reframeMax = Math.min(REFRAME_MAX, format.maxGap);
  // A tighter cap widens the window, so a word start lands in it (talking-head keeps 1.6–2.6 s).
  const reframeMin = reframeMax < REFRAME_MAX ? reframeMax * 0.6 : REFRAME_MIN;
  const cuts = map.segments.map((s) => s.start);
  const switches = (layout ?? []).map((l) => l.from);
  const marks = [...new Set([...cuts, ...switches])].sort((x, y) => x - y);
  const ends = [...marks.slice(1), map.duration];
  const reframes: number[] = [];
  marks.forEach((a, i) => {
    if (modeAt(layout, a) !== "face") return;
    reframes.push(a);
    let t = a;
    while (ends[i]! - t > reframeMax) {
      const next = words
        .filter((w) => w.s >= t + reframeMin && w.s <= t + reframeMax)
        .pop();
      if (!next) break;
      t = next.s;
      reframes.push(t);
    }
  });
  reframes.sort((x, y) => x - y);
  const pattern = q.pattern ?? format.split?.pattern ?? PATTERN;
  const pushes = (q.pushes ?? []).map(
    ([a, b, z0, z1]) => [at(a), at(b), z0, z1] as const,
  );
  const grades = (q.grade ?? []).map(([a, b, s]) => [at(a), at(b), s] as const);
  const zoomAt = (t: number) => {
    if (modeAt(layout, t) !== "face") return 1;
    for (const [a, b, z0, z1] of pushes)
      if (t >= a && t < b + PUSH_HOLD) {
        const k = Math.min(1, (t - a) / (b - a));
        return z0 + (z1 - z0) * k * k * (3 - 2 * k);
      }
    const seg = reframes.findLastIndex((x) => x <= t + 1e-6);
    return pattern[Math.max(0, seg) % pattern.length]!;
  };
  const satAt = (t: number) =>
    grades.find(([a, b]) => t >= a && t < b)?.[2] ?? 1;
  const cam = Array.from({ length: frames }, (_, f) => [
    r3(zoomAt(f / fps)),
    satAt(f / fps),
  ]);

  // Scenes in time order, the first at 0.
  const starts = Object.entries(q.scenes)
    .map(([id, ref]) => ({ id, start: Math.max(0, at(ref)) }))
    .sort((a, b) => a.start - b.start);
  if (!starts.length) throw new Error("cues.json has no scenes");
  if (starts[0]!.start > 0) {
    lines.push(`Scene ${starts[0]!.id} moved from ${starts[0]!.start}s to 0.`);
    starts[0]!.start = 0;
  }

  const overlay = Object.fromEntries(
    Object.entries(q.overlayEvents ?? {}).map(([id, refs]) => [
      id,
      refs.map(at),
    ]),
  );
  for (const id of Object.keys(overlay))
    if (!starts.some((s) => s.id === id))
      throw new Error(`overlayEvents names unknown scene "${id}"`);
  const scenes: Timeline["scenes"] = starts.map((s, i) => {
    const end = starts[i + 1]?.start ?? duration;
    const own = [
      s.start,
      ...[...reframes, ...marks].filter((t) => t >= s.start && t < end),
      ...(overlay[s.id] ?? []),
    ];
    const events = [
      ...new Set(
        own.filter((t) => t >= s.start - 1e-6).map((t) => r2(t - s.start)),
      ),
    ].sort((a, b) => a - b);
    return {
      id: s.id,
      start: r3(s.start),
      blend: 0,
      events,
      props: { c, ...(q.props ?? {}) },
    };
  });

  // R3 report: gaps between events before the CTA hold.
  const cta = scenes.find((s) => s.id === "cta")?.start ?? duration;
  const all = scenes
    .flatMap((s) => (s.events ?? []).map((e) => s.start + e))
    .filter((t) => t <= cta)
    .sort((a, b) => a - b);
  const gaps = all
    .slice(1)
    .map((t, i) => [all[i]!, t - all[i]!] as const)
    .filter(([, g]) => g > format.maxGap)
    .map(([t, g]) => `${g.toFixed(1)}s gap after ${t.toFixed(1)}s`);

  const sfx = (q.sfx ?? []).map(([ref, name, volume]) => {
    if (!existsSync(join(dir, "assets", "sfx", `${name}.wav`)))
      lines.push(
        `warning: assets/sfx/${name}.wav is missing (run agentic-video sfx ${slug})`,
      );
    return { t: at(ref), src: `sfx/${name}.wav`, volume };
  });

  // Split framing from the face track; the head breaks out over the card when the
  // cut-out exists (agentic-video matte).
  const alpha = existsSync(join(dir, "assets", "cut-alpha.webm"));
  if (layout && format.split) {
    const facePath = join(dir, "assets", "face.json");
    const face = existsSync(facePath) ? readJson<FaceTrack>(facePath) : null;
    const src = face ?? probeVideo(join(dir, "assets", "cut.mp4"));
    if (!face)
      lines.push(
        `warning: no assets/face.json (run agentic-video face ${slug}); split cards use a centred framing`,
      );
    if (!alpha && layout.some((l) => l.mode === "split"))
      lines.push(
        `note: no assets/cut-alpha.webm; run agentic-video matte ${slug}, then timeline again, for the head break-out`,
      );
    const split = { ...format.split, popOut: q.popOut ?? format.split.popOut };
    layout.forEach((l, i) => {
      if (l.mode !== "split") return;
      Object.assign(
        l,
        frameSplit(
          l.from,
          layout![i + 1]?.from ?? duration,
          split,
          src,
          format,
          face,
          alpha,
        ),
      );
    });

    // X1 bounds; the CTA hold is not counted.
    const until = scenes.find((x) => x.id === "cta")?.start ?? duration;
    const share = { face: 0, split: 0, canvas: 0 } as Record<Mode, number>;
    lines.push("Layout:");
    layout.forEach((l, i) => {
      const end = layout![i + 1]?.from ?? duration;
      const len = end - l.from;
      share[l.mode] += Math.max(0, Math.min(end, until) - l.from);
      const said = words
        .filter((w) => w.s >= l.from - 1e-6 && w.s < end)
        .slice(0, 5)
        .map((w) => w.t.trim())
        .join(" ");
      lines.push(
        `  ${l.mode.padEnd(6)} ${l.from.toFixed(2).padStart(6)}–${end.toFixed(2).padStart(6)}s ${len.toFixed(1).padStart(5)}s  "${said}…"`,
      );
      if (l.mode === "face" && len > 9)
        warnings.push(
          `face segment at ${l.from.toFixed(1)}s is ${len.toFixed(1)}s (X1: at most 9s)`,
        );
      if (l.mode === "split" && len > 20)
        warnings.push(
          `split segment at ${l.from.toFixed(1)}s is ${len.toFixed(1)}s (X1: at most 20s)`,
        );
    });
    const [lo, hi] = format.faceShare ?? [0, 1];
    const f = share.face / until;
    if (f < lo || f > hi)
      warnings.push(
        `face is ${(f * 100).toFixed(0)}% of the runtime (X1: ${lo * 100}–${hi * 100}%)`,
      );
    if (share.canvas / until > 0.1)
      warnings.push(
        `canvas is ${((share.canvas / until) * 100).toFixed(0)}% of the runtime (X1: at most 10%)`,
      );
    lines.push(
      `  face ${(f * 100).toFixed(0)}%, split ${((share.split / until) * 100).toFixed(0)}%, canvas ${((share.canvas / until) * 100).toFixed(0)}% (before the CTA)`,
    );
  }
  const endOf = (ref: Ref) => {
    const t = at(ref);
    return words.find((w) => Math.abs(w.s - t) < 1e-3)?.e ?? t + 0.3;
  };
  const emphasis = (q.emphasis ?? []).map(
    ([a, b]) => [at(a), r3(endOf(b))] as [number, number],
  );

  const fixPath = join(dir, "03-source", "fix.json");
  const fix = {
    ...(existsSync(fixPath) ? readJson<Record<string, string>>(fixPath) : {}),
    ...(q.fix ?? {}),
  };
  const timeline: Timeline = {
    width: format.width,
    height: format.height,
    fps,
    duration,
    audio: "cut-audio.wav",
    words: "assets/words-cut.json",
    ...(q.hook ? { hook: q.hook } : {}),
    captions: {
      style: format.captions,
      ...(format.captionsBottom !== undefined
        ? { bottom: format.captionsBottom }
        : {}),
      fix,
      ...(q.stop ? { stop: q.stop } : {}),
      ...(emphasis.length ? { emphasis } : {}),
    },
    footage: {
      src: "cut.mp4",
      last: "cut-last.png",
      end: map.duration,
      cam,
      ...(layout && format.split
        ? {
            layout,
            split: {
              card: format.split.card,
              radius: format.split.radius,
              seam: format.split.seam,
            },
            ...(alpha
              ? {
                  alpha: "cut-alpha.webm",
                  ...(existsSync(join(dir, "assets", "cut-alpha-last.png"))
                    ? { alphaLast: "cut-alpha-last.png" }
                    : {}),
                }
              : {}),
          }
        : {}),
    },
    ...(q.hero ? { hero: q.hero.map(at) } : {}),
    scenes,
    sfx,
  };
  const file = join(dir, "05-build", "timeline.json");
  writeFileSync(file, JSON.stringify(timeline));

  lines.push("Scenes:");
  for (const s of scenes)
    lines.push(
      `  ${s.id.padEnd(12)} ${s.start.toFixed(2).padStart(6)}s  events ${JSON.stringify(s.events)}`,
    );
  return {
    file,
    duration,
    cut: map.duration,
    words: words.length,
    lines,
    gaps,
    warnings,
  };
}
