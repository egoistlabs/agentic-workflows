// Synthesised SFX, so videos need no sound pack. The soft palette (talking-head,
// T7) keeps to taps, dry clicks, a quiet chime and a soft whoosh; the loud one is
// for motion formats only. 48 kHz mono, peaks normalised to -3 dBFS.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { videoDir, loadFormat, statusField } from "./files.js";

const SR = 48000;
const PEAK_DB = -3;

/** Deterministic noise in [-1, 1], so the files are the same on every run. */
function noise(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return (((x ^ (x >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

const gen = (d: number, f: (t: number) => number) =>
  Float64Array.from({ length: Math.round(d * SR) }, (_, i) => f(i / SR));

/** RBJ biquads, the same 2-pole Butterworth shapes ffmpeg's lowpass/highpass/bandpass use. */
function biquad(
  x: Float64Array,
  type: "lp" | "hp" | "bp",
  f: number,
  octaves = 1,
): Float64Array {
  const w = (2 * Math.PI * f) / SR;
  const cos = Math.cos(w);
  const alpha =
    type === "bp"
      ? Math.sin(w) * Math.sinh(((Math.LN2 / 2) * octaves * w) / Math.sin(w))
      : Math.sin(w) / (2 * Math.SQRT1_2);
  const [b0, b1, b2] =
    type === "lp"
      ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2]
      : type === "hp"
        ? [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2]
        : [alpha, 0, -alpha];
  const [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha];
  const y = new Float64Array(x.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i]! + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i]!;
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
}

/** Pink noise (Paul Kellet's filter on white noise). */
function pink(d: number, amp: number, seed: number): Float64Array {
  const r = noise(seed);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  return gen(d, () => {
    const w = r();
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const p = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
    return p * amp;
  });
}

/** Linear fades, like ffmpeg's afade default. */
const fade = (x: Float64Array, inDur: number, outAt?: number, outDur = 0) =>
  x.map((v, i) => {
    const t = i / SR;
    const a = inDur > 0 ? Math.min(1, t / inDur) : 1;
    const b =
      outAt === undefined
        ? 1
        : Math.max(0, Math.min(1, 1 - (t - outAt) / outDur));
    return v * a * b;
  });

const SOFT: Record<string, () => Float64Array> = {
  // Damped soft knock, no pitch drop.
  tap: () => {
    const r = noise(11);
    const x = gen(
      0.18,
      (t) =>
        0.7 * Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 45) +
        0.25 * r() * Math.exp(-t * 90),
    );
    return biquad(biquad(x, "lp", 2500), "hp", 80);
  },
  // Dry UI click.
  click: () => {
    const r = noise(23);
    return biquad(
      gen(0.04, (t) => r() * Math.exp(-t * 700)),
      "bp",
      3500,
      1.5,
    );
  },
  // Soft two-note notification.
  chime: () =>
    biquad(
      gen(
        0.8,
        (t) =>
          (t < 0.12
            ? 0.4 * Math.sin(2 * Math.PI * 1318 * t) * Math.exp(-t * 7)
            : 0) +
          (t >= 0.1
            ? 0.4 *
              Math.sin(2 * Math.PI * 1760 * (t - 0.1)) *
              Math.exp(-(t - 0.1) * 5)
            : 0),
      ),
      "lp",
      6000,
    ),
  // Soft air whoosh.
  swish: () =>
    fade(
      biquad(biquad(pink(0.45, 0.6, 37), "hp", 600), "lp", 4500),
      0.18,
      0.2,
      0.25,
    ),
};

/** Integrated-phase sine for pitch sweeps. */
function sweep(
  d: number,
  freq: (t: number) => number,
  env: (t: number) => number,
): Float64Array {
  let ph = 0;
  return gen(d, (t) => {
    ph += (2 * Math.PI * freq(t)) / SR;
    return Math.sin(ph) * env(t);
  });
}

const LOUD: Record<string, () => Float64Array> = {
  thump: () =>
    biquad(
      sweep(
        0.35,
        (t) => 55 + 70 * Math.exp(-t * 30),
        (t) => Math.exp(-t * 12),
      ),
      "lp",
      400,
    ),
  pop: () =>
    sweep(
      0.12,
      (t) => 300 + 600 * Math.exp(-t * 40),
      (t) => Math.exp(-t * 30),
    ),
  stamp: () => {
    const r = noise(41);
    const x = gen(
      0.25,
      (t) =>
        0.6 * r() * Math.exp(-t * 60) +
        0.8 * Math.sin(2 * Math.PI * 110 * t) * Math.exp(-t * 25),
    );
    return biquad(x, "lp", 1500);
  },
  rise: () => {
    const r = noise(53);
    const tone = sweep(
      0.9,
      (t) => 300 + 1500 * (t / 0.9) ** 2,
      (t) => 0.5 * (t / 0.9) ** 2,
    );
    const air = biquad(
      gen(0.9, (t) => 0.4 * r() * (t / 0.9) ** 3),
      "hp",
      1500,
    );
    return fade(
      tone.map((v, i) => v + air[i]!),
      0,
      0.84,
      0.06,
    );
  },
  ding: () =>
    gen(
      1.2,
      (t) =>
        0.5 * Math.sin(2 * Math.PI * 1568 * t) * Math.exp(-t * 4) +
        0.2 * Math.sin(2 * Math.PI * 3136 * t) * Math.exp(-t * 6),
    ),
};

export const PALETTES = { soft: SOFT, loud: { ...SOFT, ...LOUD } };
export type Palette = keyof typeof PALETTES;

/** 16-bit mono WAV with the peak at PEAK_DB. */
function wav(x: Float64Array): Buffer {
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const gain = 10 ** (PEAK_DB / 20) / peak;
  const buf = Buffer.alloc(44 + x.length * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + x.length * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(x.length * 2, 40);
  x.forEach((v, i) =>
    buf.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, v * gain)) * 32767),
      44 + i * 2,
    ),
  );
  return buf;
}

/** Writes the palette (the format's by default) into the video's assets/sfx/. */
export function sfx(
  slug: string,
  palette?: string,
): { dir: string; palette: Palette; files: string[] } {
  const dir = videoDir(slug);
  const p = (palette ??
    loadFormat(statusField(dir, "format") ?? "").sfxPalette ??
    "soft") as Palette;
  if (!(p in PALETTES)) throw new Error(`unknown palette "${p}" (soft|loud)`);
  const out = join(dir, "assets", "sfx");
  mkdirSync(out, { recursive: true });
  const files = Object.entries(PALETTES[p]).map(([name, make]) => {
    writeFileSync(join(out, `${name}.wav`), wav(make()));
    return `${name}.wav`;
  });
  return { dir: out, palette: p, files };
}
