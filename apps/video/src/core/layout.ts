// Explainer layouts (X1): each beat is `face`, `split` or `canvas`. For split
// segments this frames the footage card from the face track, holding one framing
// per segment like a locked-off camera, and lifts the caption seam above the head
// when it breaks out over the card's top edge.
import type { FaceTrack } from "./face.js";
import type { Split } from "./files.js";
import type { Rect } from "./render.js";

export type Mode = "face" | "split" | "canvas";
export const MODES: readonly Mode[] = ["face", "split", "canvas"];

export interface LayoutSeg {
  from: number;
  mode: Mode;
  /** split: the footage's rect in output px (the card clips it). */
  video?: Rect;
  /** split: caption `bottom` (fraction of the height), kept above the head. */
  captions?: number;
  /** split: the highest top of the head in output px over the segment. */
  headTop?: number;
}

/** Face height (forehead to chin) as a share of the card width. */
const FACE_OF_CARD = 0.16;
/** Without a break-out, the head top sits this far (share of the card height) below the card's edge. */
const HEADROOM = 0.06;
/** Space between the caption line and the top of the head. */
const CAPTION_GAP = 24;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/**
 * The footage rect for one split segment [from, to). It always covers the card
 * (which bleeds off the bottom edge). With `popOut`, the card's top edge crosses
 * the head `split.popOut` of the way from the hair to the chin, so the cut-out
 * (assets/cut-alpha.webm) shows the rest of the head above it.
 */
export function frameSplit(
  from: number,
  to: number,
  split: Split,
  src: { width: number; height: number },
  out: { width: number; height: number },
  face: FaceTrack | null,
  popOut: boolean,
): Pick<LayoutSeg, "video" | "captions" | "headTop"> {
  const [cx, cy, cw] = split.card;
  const ch = out.height - cy;
  const cover = Math.max(cw / src.width, ch / src.height);
  const all = face?.frames ?? [];
  let fs = all.filter((f) => f.t >= from && f.t < to);
  if (!fs.length && all.length)
    fs = [
      all.reduce((a, b) =>
        Math.abs(b.t - from) < Math.abs(a.t - from) ? b : a,
      ),
    ];
  if (!fs.length) {
    // No face track: centred, the source's top at the card's top edge.
    const w = src.width * cover;
    return {
      video: {
        x: r1(cx + (cw - w) / 2),
        y: cy,
        w: r1(w),
        h: r1(src.height * cover),
      },
      captions: split.seam,
    };
  }
  const centre = median(fs.map((f) => f.face[0] + f.face[2] / 2)) * src.width;
  const top = median(fs.map((f) => f.keep[1])) * src.height;
  const chin = median(fs.map((f) => f.face[1] + f.face[3])) * src.height;
  const s = Math.max(
    cover,
    (FACE_OF_CARD * cw) / (median(fs.map((f) => f.face[3])) * src.height),
  );
  const w = src.width * s;
  const h = src.height * s;
  const x = clamp(cx + cw / 2 - centre * s, cx + cw - w, cx);
  // The source row that lands on the card's top edge.
  const edge = popOut
    ? top + split.popOut * (chin - top)
    : top - (HEADROOM * ch) / s;
  const y = clamp(cy - edge * s, out.height - h, cy);
  const headTop = y + Math.min(...fs.map((f) => f.keep[1])) * src.height * s;
  const captions =
    popOut && headTop < cy
      ? Math.max(split.seam, 1 - (headTop - CAPTION_GAP) / out.height)
      : split.seam;
  return {
    video: { x: r1(x), y: r1(y), w: r1(w), h: r1(h) },
    captions: Math.round(captions * 1000) / 1000,
    headTop: r1(headTop),
  };
}

/** The mode at time t in a sorted layout track. */
export const modeAt = (
  layout: { from: number; mode: Mode }[] | undefined,
  t: number,
): Mode =>
  layout?.findLast((l) => l.from <= t + 1e-6)?.mode ??
  layout?.[0]?.mode ??
  "face";
