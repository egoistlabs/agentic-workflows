// R5: word-synced captions. Styles: "lower" (1–4 words, lower third),
// "keyword" (one big word per phrase, filler small) and "word" (every word, one at a time:
// key words in big caps, filler words small, numbers in the accent). Words: [{t, s, e}] in seconds.
// Explainer: captions sit on the seam above the footage card on split and canvas beats,
// and `emphasis` phrases are set in the accent serif (X6).
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { accentFont, useBrand, useVideo } from '../context.jsx';
import { segAt } from '../layout.jsx';

const STOP = new Set(['a', 'an', 'the', 'to', 'of', 'and', 'or', 'in', 'on', 'at', 'is', 'it', 'you', 'i', 'we', 'so', 'that', 'this', 'for', 'with', 'but', 'be', 'are', 'was', 'do', 'your', 'my']);

/** Groups words into phrases: break on a pause, punctuation, or maxWords. */
export const phrases = (words, maxWords = 3, pause = 0.35) => {
  const out = [];
  let cur = [];
  for (const w of words) {
    const prev = cur[cur.length - 1];
    if (cur.length && (cur.length >= maxWords || w.s - prev.e > pause || /[.,!?;:]$/.test(prev.t.trim()))) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out.map((ws) => ({ words: ws, s: ws[0].s, e: ws[ws.length - 1].e }));
};

const clean = (t, fix) => {
  const w = t.trim();
  const bare = w.replace(/[.,!?;:"]/g, '');
  return fix?.[bare] ?? fix?.[bare.toLowerCase()] ?? bare;
};

// While stills render, captions log their box so QA can check contrast behind it.
const record = (on, frame, style, rect, stroke) =>
  on && console.log(`[agentic-video:captions] ${JSON.stringify({ frame, style, rect, stroke })}`);

// `stop`: extra filler words for the keyword pick, e.g. particles of the spoken language.
// `bottom`: distance from the bottom as a fraction of the height (word: 0.21, else 0.27).
// `emphasis`: [start, end] seconds of phrases set in the accent serif (word style).
// `size` / `weight` (lower style): font size as a fraction of the width, and font weight, for quieter subtitles.
export const Captions = ({ words, style = 'lower', maxWords, fix, from = 0, bottom, hideDuring = [], stop = [], emphasis = [], size = 0.056, weight = 750 }) => {
  const brand = useBrand();
  const video = useVideo();
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;
  bottom ??= style === 'word' ? 0.21 : 0.27;
  const seg = segAt(video.footage, t);
  if (seg && seg.mode !== 'face' && video.footage.split) bottom = seg.captions ?? video.footage.split.seam;
  if (t < from || hideDuring.some(([a, b]) => t >= a && t < b)) return null;
  const accentWord = brand.accent ?? '#22d3ee';
  if (style === 'word') {
    // The current word appears 2 frames early and hard-swaps; it holds through short gaps.
    const shown = words.filter((w) => clean(w.t, fix) !== '');
    const i = shown.findLastIndex((w) => t >= w.s - 2 / fps);
    const w = shown[i];
    if (!w || t > Math.max(w.e, w.s + 0.25) + 0.5) return null;
    const text = clean(w.t, fix);
    const filler = STOP.has(text.toLowerCase()) || stop.includes(text.toLowerCase());
    const hot = /[0-9$€£₱%×]/.test(text);
    const serif = emphasis.some(([a, b]) => w.s >= a - 1e-3 && w.s < b);
    const size = filler ? width * 0.05 : width * 0.088;
    // A fixed line at the bottom: captions never move with the speaker.
    const top = Math.min(height * (1 - bottom) - size, height * 0.82 - size);
    record(video.record, video.frame, style, { x: width * 0.06, y: top, w: width * 0.88, h: size }, true);
    return (
      <AbsoluteFill>
        <div style={{ position: 'absolute', top, left: width * 0.06, right: width * 0.06, textAlign: 'center', lineHeight: 1,
          fontWeight: filler ? 650 : 900, fontSize: size, textTransform: filler ? 'none' : 'uppercase',
          letterSpacing: filler ? '0' : '-0.01em', color: hot ? accentWord : '#fff', textShadow: '0 4px 24px rgba(0,0,0,.6), 0 1px 3px rgba(0,0,0,.6)',
          WebkitTextStroke: `${filler ? 5 : 8}px rgba(0,0,0,.55)`, paintOrder: 'stroke fill',
          // The accent serif: mixed case, regular weight, a touch larger, a lighter stroke.
          ...(serif ? { fontFamily: accentFont(brand), fontStyle: 'italic', fontWeight: 400, textTransform: 'none', letterSpacing: '0',
            fontSize: width * 0.096, WebkitTextStroke: '4px rgba(0,0,0,.45)' } : {}) }}>
          {text}
        </div>
      </AbsoluteFill>
    );
  }
  const list = phrases(words, maxWords ?? (style === 'keyword' ? 3 : 4));
  const ph = list.find((x, i) => t >= x.s - 0.05 && t < (list[i + 1]?.s ?? x.e + 0.6));
  if (!ph) return null;
  const accent = brand.accent ?? '#22d3ee';

  if (style === 'keyword') {
    const isStop = (w) => { const x = clean(w.t).toLowerCase(); return STOP.has(x) || stop.includes(x); };
    const pick = (x) => [...x.words].sort((a, b) => (isStop(a) - isStop(b)) || clean(b.t).length - clean(a.t).length)[0];
    // A phrase of only filler words keeps the previous keyword on screen instead of flashing a filler word.
    let i = list.indexOf(ph);
    while (i > 0 && isStop(pick(list[i])) && ph.s - list[i - 1].e < 1.5) i--;
    const key = pick(list[i]);
    record(video.record, video.frame, style, { x: width * 0.05, y: height * 0.1, w: width * 0.9, h: width * 0.1 }, false);
    return (
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div style={{ position: 'absolute', top: height * 0.1, width: '90%', textAlign: 'center', fontWeight: 900, fontSize: width * 0.1, textTransform: 'uppercase', color: '#fff', textShadow: '0 6px 30px rgba(0,0,0,.55)', letterSpacing: '-0.02em' }}>
          {clean(key.t, fix)}
        </div>
      </AbsoluteFill>
    );
  }

  record(video.record, video.frame, style, { x: width * 0.08, y: height * (1 - bottom) - width * size * 1.15, w: width * 0.84, h: width * size * 1.15 }, false);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', bottom: height * bottom, left: width * 0.08, right: width * 0.08, textAlign: 'center', fontWeight: weight, fontSize: width * size, lineHeight: 1.15 }}>
        {ph.words.map((w, i) => {
          const on = t >= w.s - 0.03;
          // `captionFg` (brand token): ink captions for a light ground, without the dark shadow;
          // `captionHot`: the word being spoken (default: the accent).
          const ink = brand.captionFg;
          return (
            <span key={i} style={{ color: on ? (t < w.e ? (brand.captionHot ?? accent) : (ink ?? '#fff')) : ink ? `color-mix(in srgb, ${ink} 38%, transparent)` : 'rgba(255,255,255,.45)',
              textShadow: ink ? 'none' : '0 3px 18px rgba(0,0,0,.7)' }}>
              {clean(w.t, fix)}{' '}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
