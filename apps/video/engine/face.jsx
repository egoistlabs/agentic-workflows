// Face-aware placement for talking-head videos (T4). `useFace()` gives the
// speaker's face, mouth and keep-out boxes for the current frame in output
// pixels, after the footage's cover fit and per-frame camera zoom. `Zone`
// places its child once, beside, above or below the head, clear of the keep-out
// box for as long as it is up, and logs its rect for QA while stills render.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTime, useVideo, VideoContext } from './context.jsx';
import { segAt } from './layout.jsx';
import { useVideoConfig } from 'remotion';

export { useVideo, VideoContext };

const GAP = 28;
const MARGIN = 16;
const MIN_SCALE = 0.6;

/** Safe area for overlays: x 90–930, y 200–1600 on 1080×1920 (scaled for other sizes). */
const safeArea = (W, H) => ({ x0: W * (90 / 1080), x1: W * (930 / 1080), y0: H * (200 / 1920), y1: H * (1600 / 1920) });

const box = ([x, y, w, h]) => ({ x, y, w, h });

/** Face boxes at an absolute frame in output pixels, or null without a track. */
export function faceAt(ctx, frame, W, H, fps) {
  const { face, footage } = ctx;
  if (!face?.frames?.length) return null;
  const t = frame / fps;
  const k = Math.min(face.frames.length - 1, Math.max(0, t * face.fps));
  const a = face.frames[Math.floor(k)];
  const b = face.frames[Math.min(face.frames.length - 1, Math.floor(k) + 1)];
  const u = k - Math.floor(k);
  const lerp = (p, q) => p.map((v, i) => v + (q[i] - v) * u);
  const fb = lerp(a.face, b.face);
  // Explainer: no speaker on a canvas beat; in split, the face sits in the footage card.
  const seg = segAt(footage, t);
  if (seg?.mode === 'canvas') return null;
  if (seg?.mode === 'split' && seg.video) {
    const v = seg.video;
    const card = ([x, y, w, h]) => ({ x: v.x + x * v.w, y: v.y + y * v.h, w: w * v.w, h: h * v.h });
    return { face: card(fb), mouth: card(lerp(a.mouth, b.mouth)), keepOut: card(keepBox(fb)) };
  }
  // Cover fit of the source into the frame, then the camera zoom about its origin.
  const s = Math.max(W / face.width, H / face.height);
  const ox = (W - face.width * s) / 2;
  const oy = (H - face.height * s) / 2;
  const cam = footage?.cam?.[Math.min(footage.cam.length - 1, frame)];
  const zoom = Array.isArray(cam) ? cam[0] : (cam ?? 1);
  const [px, py] = (footage?.origin ?? '50% 30%').split(' ').map((v) => parseFloat(v) / 100);
  const Ox = W * px;
  const Oy = H * py;
  const map = ([x, y, w, h]) => {
    const X = ox + x * face.width * s;
    const Y = oy + y * face.height * s;
    return { x: Ox + (X - Ox) * zoom, y: Oy + (Y - Oy) * zoom, w: w * face.width * s * zoom, h: h * face.height * s * zoom };
  };
  return { face: map(fb), mouth: map(lerp(a.mouth, b.mouth)), keepOut: map(keepBox(fb)) };
}

/** Face box down past the chin by 40% of its height (mic) and up by 30% (hair). Same as src/core/face.ts. */
const keepBox = ([x, y, w, h]) => {
  const top = Math.max(0, y - h * 0.3);
  return [x, top, w, Math.min(1, y + h * 1.4) - top];
};

/** The speaker's face, mouth and keep-out boxes (px) for this frame, or null. */
export const useFace = () => {
  const ctx = useVideo();
  const { width, height, fps } = useVideoConfig();
  return faceAt(ctx, ctx.frame, width, height, fps);
};

export const intersects = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Fixed boxes for a centred, chest-up speaker, used when there is no face track. */
function fixedPlace(place, w, h, W, H) {
  const sx = W / 1080;
  const sy = H / 1920;
  if (place === 'aboveHead') {
    const s = Math.min(1, (210 * sy) / h, (W - 2 * 110 * sx) / w);
    return { x: (W - w * s) / 2, y: 120 * sy, s, forced: false };
  }
  if (place === 'belowChin') {
    const s = Math.min(1, (W - 2 * 90 * sx) / w);
    return { x: (W - w * s) / 2, y: 1250 * sy, s, forced: false };
  }
  const s = Math.min(1, (320 * sx) / w, (350 * sy) / h);
  return { x: 690 * sx, y: 400 * sy, s, forced: false };
}

/** Top of the default word-caption band; belowChin stays above it. */
const captionTop = (W, H) => H * (1 - 0.21) - W * 0.088 - 12;

const OTHERS = { besideHead: ['aboveHead', 'belowChin'], aboveHead: ['besideHead', 'belowChin'], belowChin: ['besideHead', 'aboveHead'] };

/**
 * Where a w×h child goes for this face: the asked-for place, else another place
 * with room. `forced` when nothing fits without touching the keep-out box.
 */
export function placeFor(place, side, w, h, f, W, H) {
  if (!f) return fixedPlace(place, w, h, W, H);
  let first;
  for (const pl of [place, ...OTHERS[place]]) {
    const q = placeOne(pl, side, w, h, f, W, H);
    if (!q.forced) return { ...q, place: pl };
    first ??= { ...q, place };
  }
  return first;
}

function placeOne(place, side, w, h, f, W, H) {
  const A = safeArea(W, H);
  if (place === 'belowChin') A.y1 = Math.min(A.y1, captionTop(W, H));
  const K = { x: f.keepOut.x - MARGIN, y: f.keepOut.y - MARGIN, w: f.keepOut.w + 2 * MARGIN, h: f.keepOut.h + 2 * MARGIN };
  const cx = f.face.x + f.face.w / 2;
  const clampX = (x, ww) => Math.min(A.x1 - ww, Math.max(A.x0, x));
  const clampY = (y, hh) => Math.min(A.y1 - hh, Math.max(A.y0, y));

  if (place === 'aboveHead' || place === 'belowChin') {
    const above = place === 'aboveHead';
    const room = above ? K.y - GAP - A.y0 : A.y1 - (K.y + K.h + GAP);
    const s = Math.min(1, room / h, (A.x1 - A.x0) / w);
    const ss = Math.max(s, MIN_SCALE);
    const x = clampX(cx - (w * ss) / 2, w * ss);
    const y = above ? Math.max(A.y0, K.y - GAP - h * ss) : clampY(K.y + K.h + GAP, h * ss);
    return { x, y, s: ss, forced: s < MIN_SCALE };
  }

  // besideHead: the side with more free wall, unless one is asked for.
  const room = { left: K.x - GAP - A.x0, right: A.x1 - (K.x + K.w) - GAP };
  const order = side === 'left' || side === 'right' ? [side] : room.left > room.right ? ['left', 'right'] : ['right', 'left'];
  for (const sd of order) {
    const s = Math.min(1, room[sd] / w);
    if (s < MIN_SCALE) continue;
    const x = sd === 'left' ? K.x - GAP - w * s : K.x + K.w + GAP;
    // On the wall beside the head, centred on the face.
    return { x, y: clampY(f.face.y + f.face.h / 2 - (h * s) / 2, h * s), s, forced: false, side: sd };
  }
  const sd = order[0];
  const x = sd === 'left' ? A.x0 : A.x1 - w * MIN_SCALE;
  return { x, y: clampY(f.face.y + f.face.h / 2 - (h * MIN_SCALE) / 2, h * MIN_SCALE), s: MIN_SCALE, forced: true, side: sd };
}

/**
 * Union of the face, mouth and keep-out boxes over a span of frames: everywhere
 * the speaker goes (with the camera reframes) while an overlay is up.
 */
export function faceSpan(ctx, from, to, W, H, fps) {
  let u = null;
  const grow = (a, b) => {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  };
  for (let f = Math.max(0, from); f <= to; f += 2) {
    const b = faceAt(ctx, f, W, H, fps);
    if (!b) return null;
    u = u ? { face: grow(u.face, b.face), mouth: grow(u.mouth, b.mouth), keepOut: grow(u.keepOut, b.keepOut) } : b;
  }
  return u;
}

/**
 * Places an overlay against the face, once: `place` is besideHead | aboveHead |
 * belowChin, `side` auto | left | right (besideHead). The spot clears the face
 * for the whole time the overlay is up (`from`–`to`, absolute seconds; default
 * the scene), then holds still. It never follows the speaker around.
 * `width` is the child's layout width. Its height is measured; pass `height` (the
 * tallest it gets) when the content grows while it is up, so the spot never changes.
 */
export const Zone = ({ place = 'besideHead', side = 'auto', width = 320, height, from, to, id, children, style }) => {
  const ctx = useVideo();
  const { fps: rate } = useVideoConfig();
  // T4 zones belong to the full-frame speaker: on an explainer's split or canvas beat they draw nothing.
  const mode = segAt(ctx.footage, ctx.frame / rate)?.mode ?? 'face';
  const { abs, t, length } = useTime();
  const { width: W, height: H, fps } = useVideoConfig();
  const ref = useRef(null);
  const [measured, setH] = useState(width);
  useLayoutEffect(() => {
    const m = ref.current?.offsetHeight;
    if (!height && m && Math.abs(m - measured) > 0.5) setH(m);
  });
  const h = height ?? measured;

  const a = Math.round((from ?? abs - t) * fps);
  const b = Math.round((to ?? abs - t + length) * fps);
  const p = useMemo(() => placeFor(place, side, width, h, faceSpan(ctx, a, b, W, H, fps), W, H), [place, side, width, h, a, b, ctx.face, ctx.footage, W, H, fps]);
  const rect = { x: p.x, y: p.y, w: width * p.s, h: h * p.s };
  if (mode !== 'face') return null;
  if (ctx.record) {
    const f = faceAt(ctx, ctx.frame, W, H, fps);
    console.log(`[agentic-video:zone] ${JSON.stringify({ frame: ctx.frame, id: id ?? place, place: p.place ?? place, rect, keepOut: f?.keepOut ?? null, forced: !!p.forced })}`);
  }
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width, transform: `scale(${p.s})`, transformOrigin: '0 0', ...style }}>
      <div ref={ref}>{children}</div>
    </div>
  );
};
