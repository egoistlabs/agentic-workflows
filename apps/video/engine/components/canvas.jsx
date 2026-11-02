// Explainer canvas (X2–X7): original, light diagrams on the brand ground, built
// on the spoken word. All times are absolute seconds (cue times from `c`), so a
// scene passes `c.step1` straight through. Sizes are for a 1080-wide frame; place
// components inside `World` or `Canvas`: both draw nothing on face beats, so a
// scene can stay up across layout switches. The accent is light (strokes, glow, the
// active state); `brand.state` (default green) is only for state such as counts.
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { accentFont, useBrand, useTime } from '../context.jsx';
import { useLayout } from '../layout.jsx';
import { Easing, map, p, pop } from '../motion.js';

const lerp = (a, b, k) => a + (b - a) * k;
const accentOf = (brand) => brand.accent ?? '#22d3ee';
const glowOf = (brand) => brand.accentGlow ?? 'rgba(34,211,238,.18)';

/** The brand ground with a faint dot grid and a soft vignette (X6). The engine draws it under split and canvas beats. */
export const GridGround = ({ gap = 28, dot = 'rgba(255,255,255,.075)', style }) => {
  const brand = useBrand();
  return (
    <AbsoluteFill style={{ background: brand.bg ?? '#0b0d10', ...style }}>
      <AbsoluteFill style={{ backgroundImage: `radial-gradient(${dot} 1.6px, transparent 1.7px)`, backgroundSize: `${gap}px ${gap}px` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 35%, transparent 45%, rgba(0,0,0,.55) 100%)' }} />
    </AbsoluteFill>
  );
};

/**
 * One world the camera travels through (X4). `stops`: [[at, x, y, zoom, opts]],
 * where (x, y) is the world point centred in the canvas. The camera eases to each
 * stop from its time over `opts.dur` (default 0.8 s); `opts.whip` makes a fast
 * move with motion blur. Children are laid out in world px.
 */
export const World = ({ stops, children, style }) => {
  const { abs } = useTime();
  const { canvas, mode } = useLayout();
  if (mode === 'face') return null;
  const list = [...stops].sort((a, b) => a[0] - b[0]);
  const i = Math.max(0, list.findLastIndex((s) => abs >= s[0]));
  const cur = list[i];
  const prev = list[Math.max(0, i - 1)];
  const o = cur[4] ?? {};
  const dur = o.dur ?? (o.whip ? 0.35 : 0.8);
  const k = i === 0 && abs < cur[0] ? 1 : p(abs, cur[0], cur[0] + dur, o.whip ? Easing.inOut(Easing.cubic) : Easing.bezier(0.65, 0, 0.35, 1));
  const [x, y, z] = [1, 2, 3].map((j) => lerp(prev[j], cur[j], k));
  const blur = o.whip ? Math.sin(Math.PI * k) * 14 : 0;
  return (
    <div style={{ position: 'absolute', left: canvas.x, top: canvas.y, width: canvas.w, height: canvas.h, overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${canvas.w / 2 - x * z}px, ${canvas.h / 2 - y * z}px) scale(${z})`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>
        {children}
      </div>
    </div>
  );
};

/**
 * A canvas title that builds word by word (X5): bold sans, with `*phrase*` set in
 * the accent serif. `lines`: strings; `at` + `step`, or `times` per word. `underline`
 * draws an accent stroke under the last line.
 */
export const CanvasTitle = ({ lines, at = 0, step = 0.12, times, size = 64, align = 'center', underline = false, style }) => {
  const brand = useBrand();
  const { abs } = useTime();
  let n = 0;
  const rows = lines.map((line) =>
    line.split(/(\*[^*]+\*)/).filter(Boolean).flatMap((part) => {
      const serif = /^\*.*\*$/.test(part);
      return part.replace(/^\*|\*$/g, '').split(/\s+/).filter(Boolean).map((w) => ({ w, serif, i: n++ }));
    }),
  );
  const start = (i) => times?.[i] ?? at + i * step;
  const last = start(n - 1) + 0.3;
  return (
    <div style={{ textAlign: align, lineHeight: 1.05, letterSpacing: '-0.02em', ...style }}>
      {rows.map((row, r) => (
        <div key={r} style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
          {row.map(({ w, serif, i }) => {
            const k = p(abs, start(i), start(i) + 0.35);
            return (
              <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', opacity: k, transform: `translateY(${(1 - k) * 0.3}em)`, filter: `blur(${(1 - k) * 6}px)`,
                fontSize: serif ? size * 1.08 : size, fontWeight: serif ? 400 : 800, fontStyle: serif ? 'italic' : 'normal',
                fontFamily: serif ? accentFont(brand) : undefined, letterSpacing: serif ? '0' : undefined }}>
                {w}
              </span>
            );
          })}
          {underline && r === rows.length - 1 && (
            <div style={{ position: 'absolute', left: 0, bottom: -10, height: 5, borderRadius: 3, width: `${map(abs, last, last + 0.5, 0, 100)}%`, background: accentOf(brand), boxShadow: `0 0 18px ${glowOf(brand)}` }} />
          )}
        </div>
      ))}
    </div>
  );
};

/**
* The generic hero object (X2): a numbered contents list that returns between
 * sections. `active` is the lit item (index, or -1 for none: the overview and the
 * recap); the rest are dimmed. Items enter from `at` with `step`, or at `times`.
 */
export const ContentsList = ({ items, active = -1, at = 0, step = 0.12, times, width = 860, size = 54, style }) => {
  const brand = useBrand();
  const { abs } = useTime();
  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: size * 0.45, ...style }}>
      {items.map((label, i) => {
        const k = p(abs, times?.[i] ?? at + i * step, (times?.[i] ?? at + i * step) + 0.4);
        const on = i === active;
        const dim = active >= 0 && !on;
        return (
          <div key={i} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: size * 0.7, padding: `${size * 0.32}px ${size * 0.6}px`, borderRadius: 14,
            opacity: k * (dim ? 0.38 : 1), transform: `translateX(${(1 - k) * -40}px) scale(${on ? 1.04 : 1})`, transformOrigin: 'left center',
            background: on ? 'rgba(255,255,255,.07)' : 'transparent', boxShadow: on ? `0 0 40px ${glowOf(brand)}` : 'none' }}>
            {on && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 6, borderRadius: 3, background: accentOf(brand) }} />}
            <span style={{ fontSize: size * 0.8, fontWeight: 800, color: on ? accentOf(brand) : brand.muted ?? '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
            <span style={{ fontSize: size, fontWeight: 700 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

/** An SVG stroke drawn by progress from `at` over `dur`, with an accent glow (a road, a wave). `d` is in `viewBox` units. */
export const DrawPath = ({ d, at = 0, dur = 0.8, width = 6, color, glow = true, viewBox = '0 0 1000 1000', style }) => {
  const brand = useBrand();
  const { abs } = useTime();
  const k = p(abs, at, at + dur, Easing.inOut(Easing.cubic));
  const c = color ?? accentOf(brand);
  return (
    <svg viewBox={viewBox} style={{ position: 'absolute', overflow: 'visible', ...style }}>
      <path d={d} pathLength={1} fill="none" stroke={c} strokeWidth={width} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - k}
        style={{ filter: glow ? `drop-shadow(0 0 ${width * 2}px ${c})` : undefined }} />
    </svg>
  );
};

/**
 * Nodes and connectors that build on cue times (e.g. Idea → Draft → Publish).
 * `nodes`: [{id, label, x, y, at, kind: 'accent' | 'plain', sub}] in px (node centres);
 * `edges`: [{from, to, at}] drawn as elbow lines. Lay it out inside the canvas or a World.
 */
export const Tree = ({ nodes, edges = [], size = 44, style }) => {
  const brand = useBrand();
  const { abs } = useTime();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <div style={{ position: 'absolute', inset: 0, ...style }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        {edges.map((e, i) => {
          const a = byId[e.from];
          const b = byId[e.to];
          if (!a || !b) return null;
          const k = p(abs, e.at, e.at + 0.5, Easing.inOut(Easing.cubic));
          const midY = (a.y + b.y) / 2;
          return (
            <path key={i} d={`M ${a.x} ${a.y} V ${midY} H ${b.x} V ${b.y}`} pathLength={1} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={3}
              strokeDasharray={1} strokeDashoffset={1 - k} />
          );
        })}
      </svg>
      {nodes.map((n) => {
        const k = pop(abs, n.at, 0.45);
        const accent = n.kind === 'accent';
        return (
          <div key={n.id} style={{ position: 'absolute', left: n.x, top: n.y, transform: `translate(-50%, -50%) scale(${Math.max(0, k)})`, opacity: Math.min(1, k * 1.5), textAlign: 'center' }}>
            <div style={{ padding: `${size * 0.3}px ${size * 0.6}px`, borderRadius: 12, fontSize: size, fontWeight: 750, whiteSpace: 'nowrap',
              background: accent ? accentOf(brand) : 'rgba(255,255,255,.1)', color: accent ? '#fff' : brand.fg ?? '#f4f4f5',
              boxShadow: accent ? `0 0 34px ${glowOf(brand)}` : 'none' }}>
              {n.label}
            </div>
            {n.sub && <div style={{ marginTop: 10, fontSize: size * 0.72, fontWeight: 600, color: brand.muted ?? '#cbd5e1', whiteSpace: 'nowrap' }}>{n.sub}</div>}
          </div>
        );
      })}
    </div>
  );
};

/** Numbered chips that light up in turn: `items` labels, each lit at `times[i]` (or `at` + i·`step`). */
export const Chips = ({ items, at = 0, step = 0.6, times, size = 64, style }) => {
  const brand = useBrand();
  const { abs } = useTime();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: size * 0.4, ...style }}>
      {items.map((label, i) => {
        const t0 = times?.[i] ?? at + i * step;
        const k = p(abs, t0, t0 + 0.4);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: size * 0.4, opacity: 0.3 + 0.7 * k }}>
            <div style={{ width: size, height: size, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.48, fontWeight: 800,
              border: `${Math.max(3, size * 0.07)}px solid ${k > 0.5 ? accentOf(brand) : 'rgba(255,255,255,.3)'}`, color: k > 0.5 ? accentOf(brand) : 'rgba(255,255,255,.5)',
              boxShadow: `0 0 ${30 * k}px ${glowOf(brand)}`, transform: `scale(${1 + 0.08 * Math.sin(Math.PI * k)})` }}>
              {i + 1}
            </div>
            <span style={{ fontSize: size * 0.56, fontWeight: 700, transform: `translateX(${(1 - k) * 20}px)` }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

const Thumb = ({ src, w, h }) =>
  src ? (
    <Img src={staticFile(src)} style={{ width: w, height: h, objectFit: 'cover', display: 'block' }} />
  ) : (
    <div style={{ width: w, height: h, background: 'linear-gradient(160deg, rgba(255,255,255,.16), rgba(255,255,255,.04))' }} />
  );

/**
 * A grid of 9:16 thumbnails with count badges, for a proof-collage hook. `items`: [{src, count}];
 * `src` is a file in assets/ the human supplied, else an original placeholder.
 * `example` labels invented content as illustrative (X7).
 */
export const ProofCollage = ({ items, at = 0, step = 0.08, columns = 3, width = 760, example = false, style }) => {
  const brand = useBrand();
  const { abs } = useTime();
  const gap = 18;
  const w = (width - gap * (columns - 1)) / columns;
  const h = (w * 16) / 9;
  return (
    <div style={{ width, ...style }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, ${w}px)`, gap }}>
        {items.map((it, i) => {
          const k = pop(abs, at + i * step, 0.5);
          const badge = p(abs, at + i * step + 0.35, at + i * step + 0.65);
          return (
            <div key={i} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', transform: `scale(${Math.max(0, k)})`, opacity: Math.min(1, k * 1.5), boxShadow: '0 14px 40px rgba(0,0,0,.45)' }}>
              <Thumb src={it.src} w={w} h={h} />
              {it.count && (
                <div style={{ position: 'absolute', left: 10, bottom: 10, padding: '4px 12px', borderRadius: 8, fontSize: 24, fontWeight: 800, color: '#fff',
                  background: brand.state ?? '#22c55e', opacity: badge, transform: `translateY(${(1 - badge) * 10}px)` }}>
                  ▶ {it.count}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {example && <div style={{ marginTop: 12, textAlign: 'right', fontSize: 22, fontWeight: 600, color: brand.muted ?? '#cbd5e1', opacity: 0.7 }}>illustrative</div>}
    </div>
  );
};

/** A plain document page: grey text lines with a few accent lines. */
const Page = ({ w, seed, accent }) => (
  <div style={{ width: w, height: w * 1.3, background: '#f5f5f4', borderRadius: 6, padding: w * 0.1, boxShadow: '0 12px 30px rgba(0,0,0,.4)' }}>
    {Array.from({ length: 9 }, (_, j) => (
      <div key={j} style={{ height: w * 0.035, marginBottom: w * 0.06, borderRadius: 2, width: `${55 + ((seed * 37 + j * 23) % 40)}%`, background: j % 4 === 1 ? accent : '#c7c7c4' }} />
    ))}
  </div>
);

/**
 * The CTA deliverable: what the viewer gets keeps moving under a still CTA
 * title (R8, explainer note). `kind`: 'docs' (pages stacking into a grid) or
 * 'video' (a video card: `src` thumbnail, `title`, `meta` such as a view count).
 */
export const DeliverablePreview = ({ kind = 'docs', count = 8, at = 0, src, title, meta, width = 820, style }) => {
  const brand = useBrand();
  const { abs } = useTime();
  const drift = Math.sin((abs - at) * 0.9) * 6;
  if (kind === 'video') {
    const k = pop(abs, at, 0.6);
    return (
      <div style={{ width, transform: `translateY(${drift}px) scale(${Math.max(0, k)})`, opacity: Math.min(1, k * 1.5), ...style }}>
        <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: `0 20px 60px rgba(0,0,0,.5), 0 0 60px ${glowOf(brand)}` }}>
          <Thumb src={src} w={width} h={(width * 9) / 16} />
        </div>
        {title && <div style={{ marginTop: 16, fontSize: 34, fontWeight: 750 }}>{title}</div>}
        {meta && <div style={{ marginTop: 4, fontSize: 26, color: brand.muted ?? '#cbd5e1' }}>{meta}</div>}
      </div>
    );
  }
  const columns = 4;
  const gap = 16;
  const w = (width - gap * (columns - 1)) / columns;
  return (
    <div style={{ width, display: 'grid', gridTemplateColumns: `repeat(${columns}, ${w}px)`, gap, transform: `translateY(${drift}px)`, ...style }}>
      {Array.from({ length: count }, (_, i) => {
        const k = pop(abs, at + i * 0.12, 0.5);
        return (
          <div key={i} style={{ transform: `translateY(${(1 - Math.min(1, k)) * 80}px) rotate(${(1 - Math.min(1, k)) * (i % 2 ? 6 : -6)}deg)`, opacity: Math.min(1, k * 1.5) }}>
            <Page w={w} seed={i} accent={accentOf(brand)} />
          </div>
        );
      })}
    </div>
  );
};

/** The canvas rect as a positioned box, for scenes that lay out without a World. Nothing on face beats. */
export const Canvas = ({ children, style }) => {
  const { canvas, mode } = useLayout();
  const { width } = useVideoConfig();
  if (mode === 'face') return null;
  return <div style={{ position: 'absolute', left: canvas.x, top: canvas.y, width: canvas.w ?? width, height: canvas.h, ...style }}>{children}</div>;
};
