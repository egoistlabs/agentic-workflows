// Explainer layouts (X1): which of face / split / canvas is on screen, where the
// footage card sits, and the canvas rect scenes draw in. Without a layout track
// (talking-head, motion formats) the whole frame is one layout.
import { useVideoConfig } from 'remotion';
import { useVideo } from './context.jsx';

/** The layout segment at time t (seconds), or null without a layout track. */
export const segAt = (footage, t) => {
  const list = footage?.layout;
  if (!list?.length) return null;
  let seg = list[0];
  for (const l of list) {
    if (l.from > t + 1e-6) break;
    seg = l;
  }
  return seg;
};

/** Caption key-word size as a share of the width (components/captions.jsx). */
const CAPTION = 0.088;

/**
 * `{ mode, seg, canvas, card }` for the current frame. `canvas` is the rect above
 * the caption seam in split (the full frame otherwise); `card` the footage card.
 */
export const useLayout = () => {
  const { footage, frame } = useVideo();
  const { width: W, height: H, fps } = useVideoConfig();
  const seg = segAt(footage, frame / fps);
  const mode = seg?.mode ?? (footage ? 'face' : 'canvas');
  const sp = footage?.split;
  const card = sp ? { x: sp.card[0], y: sp.card[1], w: sp.card[2], h: H - sp.card[1], radius: sp.radius } : null;
  const full = { x: 0, y: 0, w: W, h: H };
  if (mode !== 'split' || !sp) return { mode, seg, canvas: full, card };
  const seam = H * (1 - (seg.captions ?? sp.seam)) - W * CAPTION - 16;
  return { mode, seg, canvas: { x: 0, y: 0, w: W, h: Math.round(seam) }, card };
};
